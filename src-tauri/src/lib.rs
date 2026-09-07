use std::collections::HashSet;
use std::os::windows::process::CommandExt;
use std::path::Path;
use std::process::Command;
use netstat2::*;
use serde::{Deserialize, Serialize};
use sysinfo::{Pid, System};
use tauri::{
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, PhysicalPosition, PhysicalSize, Position, WebviewWindow, WindowEvent,
};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PortInfo {
    #[serde(rename = "LocalPort")]
    pub local_port: u16,
    #[serde(rename = "PID")]
    pub pid: u32,
    #[serde(rename = "ProcessName")]
    pub process_name: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct KillResult {
    pub success: bool,
    pub error: Option<String>,
}

const PORT_THRESHOLD: u16 = 1000;
const ENRICHABLE_PROCESSES: &[&str] = &["node.exe", "java.exe", "python.exe", "pythonw.exe"];
const IGNORED_FOLDERS: &[&str] = &["bin", "dist", "build", "src", "lib", ".output", "target"];
const CREATE_NO_WINDOW: u32 = 0x08000000;

fn extract_project_name(cmd: &[std::ffi::OsString], process_name: &str) -> Option<String> {
    for arg in cmd {
        let arg_str = arg.to_string_lossy();
        if arg_str.to_lowercase().ends_with(&process_name.to_lowercase()) {
            continue;
        }

        if let Some(pos) = arg_str.find(":\\") {
            let path_part = &arg_str[pos.saturating_sub(1)..];
            let clean_part = path_part.trim_matches('"').split_whitespace().next().unwrap_or(path_part);
            let path = Path::new(clean_part);
            let components: Vec<_> = path.iter().map(|c| c.to_string_lossy().to_string()).collect();
            if components.len() > 1 {
                let last = components.last().unwrap();
                let mut folder_idx = if last.contains('.') {
                    components.len().saturating_sub(2)
                } else {
                    components.len().saturating_sub(1)
                };

                if folder_idx < components.len() {
                    let folder_name = &components[folder_idx];
                    if IGNORED_FOLDERS.contains(&folder_name.to_lowercase().as_str()) && folder_idx > 0 {
                        folder_idx -= 1;
                    }
                    let candidate = &components[folder_idx];
                    if !candidate.is_empty() && !candidate.contains(':') && !candidate.contains('\\') {
                        return Some(candidate.to_string());
                    }
                }
            }
        }
    }
    None
}

#[tauri::command]
fn get_ports() -> Result<Vec<PortInfo>, String> {
    let mut sys = System::new();
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);

    let af_flags = AddressFamilyFlags::IPV4 | AddressFamilyFlags::IPV6;
    let proto_flags = ProtocolFlags::TCP;
    let sockets = get_sockets_info(af_flags, proto_flags).map_err(|e| e.to_string())?;

    let mut results = Vec::new();
    let mut seen_ports = HashSet::new();

    for socket in sockets {
        if let ProtocolSocketInfo::Tcp(tcp_info) = socket.protocol_socket_info {
            if tcp_info.state == TcpState::Listen
                && tcp_info.local_port > PORT_THRESHOLD
                && seen_ports.insert(tcp_info.local_port)
            {
                let pid = socket.associated_pids.first().copied().unwrap_or(0);
                let mut process_name = "Desconhecido".to_string();

                if pid > 0 {
                    if let Some(proc) = sys.process(Pid::from_u32(pid)) {
                        let raw_name = proc.name().to_string_lossy().to_string();
                        process_name = raw_name.clone();

                        let is_enrichable = ENRICHABLE_PROCESSES
                            .iter()
                            .any(|p| raw_name.eq_ignore_ascii_case(p));

                        if is_enrichable {
                            if let Some(proj) = extract_project_name(proc.cmd(), &raw_name) {
                                process_name = format!("{} ({})", raw_name, proj);
                            }
                        }
                    }
                }

                results.push(PortInfo {
                    local_port: tcp_info.local_port,
                    pid,
                    process_name,
                });
            }

        }
    }

    results.sort_by_key(|p| p.local_port);
    Ok(results)
}

#[tauri::command]
fn kill_process(pid: u32) -> KillResult {
    if pid == 0 {
        return KillResult {
            success: false,
            error: Some("PID inválido".into()),
        };
    }

    let output = Command::new("taskkill")
        .args(["/F", "/PID", &pid.to_string()])
        .creation_flags(CREATE_NO_WINDOW)
        .output();

    match output {
        Ok(out) => {
            if out.status.success() {
                KillResult {
                    success: true,
                    error: None,
                }
            } else {
                let err = String::from_utf8_lossy(&out.stderr).trim().to_string();
                KillResult {
                    success: false,
                    error: Some(if err.is_empty() { "Falha ao finalizar processo".into() } else { err }),
                }
            }
        }
        Err(e) => KillResult {
            success: false,
            error: Some(e.to_string()),
        },
    }
}

#[tauri::command]
fn open_external(url: String) -> Result<(), String> {
    open::that(&url).map_err(|e| e.to_string())
}

#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}

fn show_window(window: &WebviewWindow) {
    if let Ok(Some(monitor)) = window.primary_monitor() {
        let screen_size = monitor.size();
        let win_size = window.outer_size().unwrap_or(PhysicalSize::new(360, 500));

        let mut x = screen_size.width as i32 - win_size.width as i32 - 12;
        let mut y = screen_size.height as i32 - win_size.height as i32 - 50;

        if x < 0 { x = 0; }
        if y < 0 { y = 0; }

        let _ = window.set_position(Position::Physical(PhysicalPosition::new(x, y)));
    }
    let _ = window.show();
    let _ = window.set_focus();
}

fn toggle_window(window: &WebviewWindow) {
    if window.is_visible().unwrap_or(false) {
        let _ = window.hide();
    } else {
        show_window(window);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                show_window(&window);
            }
        }))
        .setup(|app| {
            // Setup tray icon
            let icon = app.default_window_icon().cloned().expect("default window icon missing");
            let _tray = TrayIconBuilder::new()
                .icon(icon)
                .tooltip("Taskvasne")
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button, button_state, .. } = event {
                        if button_state == MouseButtonState::Up && (button == MouseButton::Left || button == MouseButton::Right) {
                            if let Some(window) = tray.app_handle().get_webview_window("main") {
                                toggle_window(&window);
                            }
                        }
                    }
                })
                .build(app)?;

            // Setup blur event to hide window when focus is lost
            if let Some(window) = app.get_webview_window("main") {
                let win_clone = window.clone();
                window.on_window_event(move |event| {
                    if let WindowEvent::Focused(false) = event {
                        let _ = win_clone.hide();
                    }
                });

                // Mostra a janela posicionada ao lado da bandeja na inicialização
                show_window(&window);
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_ports,
            kill_process,
            open_external,
            quit_app
        ])
        .run(tauri::generate_context!())
        .expect("error while running taskvasne application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::ffi::OsString;

    #[test]
    fn test_extract_project_name_with_dist() {
        let cmd = vec![
            OsString::from("node.exe"),
            OsString::from("C:\\Users\\Raphael\\Projects\\awesome-app\\dist\\server.js"),
        ];
        let name = extract_project_name(&cmd, "node.exe");
        assert_eq!(name, Some("awesome-app".to_string()));
    }

    #[test]
    fn test_extract_project_name_direct_folder() {
        let cmd = vec![
            OsString::from("python.exe"),
            OsString::from("D:\\Workspace\\backend-api\\main.py"),
        ];
        let name = extract_project_name(&cmd, "python.exe");
        assert_eq!(name, Some("backend-api".to_string()));
    }

    #[test]
    fn test_kill_process_invalid_pid() {
        let res = kill_process(0);
        assert!(!res.success);
        assert_eq!(res.error, Some("PID inválido".to_string()));
    }

    #[test]
    fn test_get_ports_threshold() {
        let ports = get_ports();
        assert!(ports.is_ok());
        let list = ports.unwrap();
        for p in list {
            assert!(p.local_port > PORT_THRESHOLD);
        }
    }
}

