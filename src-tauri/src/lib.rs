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
    #[serde(rename = "ProjectName")]
    pub project_name: Option<String>,
    #[serde(rename = "Details")]
    pub details: Option<String>,
    #[serde(rename = "CommandLine")]
    pub command_line: Option<String>,
    #[serde(rename = "Category")]
    pub category: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct KillResult {
    pub success: bool,
    pub error: Option<String>,
}

const PORT_THRESHOLD: u16 = 1000;
const SCRIPT_RUNNERS: &[&str] = &[
    "node.exe", "node", "python.exe", "pythonw.exe", "python",
    "java.exe", "java", "bun.exe", "bun", "deno.exe", "deno",
    "cargo.exe", "go.exe", "ruby.exe", "php.exe"
];
const IGNORED_FOLDERS: &[&str] = &[
    "bin", "dist", "build", "src", "lib", ".output", "target",
    "system32", "windows", "node_modules", "backend"
];
const CREATE_NO_WINDOW: u32 = 0x08000000;

fn sanitize_path(p: &str) -> String {
    p.replace('/', "\\").trim_matches('"').to_string()
}

fn extract_folder_name(path_str: &str) -> Option<String> {
    let clean = sanitize_path(path_str);
    let path = Path::new(&clean);
    let mut components: Vec<_> = path.iter().map(|c| c.to_string_lossy().to_string()).collect();

    while let Some(last) = components.last() {
        let lower = last.to_lowercase();
        if IGNORED_FOLDERS.contains(&lower.as_str())
            || lower.contains('.')
            || lower.contains(':')
            || lower.is_empty()
        {
            components.pop();
        } else {
            return Some(last.clone());
        }
    }
    None
}

fn extract_script_name(cmd: &[std::ffi::OsString], process_name: &str) -> Option<String> {
    let extensions = [".js", ".mjs", ".cjs", ".ts", ".py", ".jar", ".json"];
    for arg in cmd {
        let arg_str = arg.to_string_lossy();
        if arg_str.to_lowercase().ends_with(&process_name.to_lowercase()) {
            continue;
        }

        let clean = sanitize_path(&arg_str);
        let path = Path::new(&clean);
        if let Some(file_name) = path.file_name() {
            let name_str = file_name.to_string_lossy().to_string();
            let lower = name_str.to_lowercase();
            if extensions.iter().any(|ext| lower.ends_with(ext)) {
                return Some(name_str);
            }
        }
    }
    None
}

fn classify_process(raw_name: &str, exe_path: Option<&str>, cwd_str: Option<&str>) -> String {
    let lower_name = raw_name.to_lowercase();
    let lower_exe = exe_path.map(|e| e.to_lowercase()).unwrap_or_default();
    let lower_cwd = cwd_str.map(|c| c.to_lowercase()).unwrap_or_default();

    // 1. Banco de dados
    const DB_NAMES: &[&str] = &[
        "postgres", "mysqld", "mysql", "mariadb", "redis", "mongod",
        "cockroach", "clickhouse", "memcached", "supabase", "surreal"
    ];
    if DB_NAMES.iter().any(|db| lower_name.contains(db) || lower_exe.contains(db)) {
        return "database".to_string();
    }

    // 2. Sistema Windows (processos críticos)
    const SYSTEM_EXES: &[&str] = &[
        "svchost.exe", "vmms.exe", "system", "lsass.exe", "services.exe",
        "spoolsv.exe", "smss.exe", "csrss.exe", "wininit.exe", "winlogon.exe",
        "taskhostw.exe", "explorer.exe", "dasHost.exe", "RuntimeBroker.exe"
    ];
    if SYSTEM_EXES.iter().any(|s| lower_name == *s)
        || lower_exe.contains("windows\\system32")
        || lower_exe.contains("windows\\syswow64")
        || (lower_cwd.contains("windows\\system32") && !lower_name.starts_with("node"))
    {
        return "system".to_string();
    }

    // 3. Desenvolvimento (Node, Python, Bun, Deno, Java, etc.)
    let is_runner = SCRIPT_RUNNERS.iter().any(|r| raw_name.eq_ignore_ascii_case(r));
    if is_runner
        || lower_cwd.contains("project")
        || lower_cwd.contains("workspace")
        || lower_cwd.contains("repo")
        || lower_cwd.contains("dev")
    {
        return "dev".to_string();
    }

    // 4. Aplicativo / Terceiros instalado pelo usuário
    "app".to_string()
}

fn extract_process_details(proc: &sysinfo::Process, raw_name: &str) -> (Option<String>, Option<String>, Option<String>, String) {
    let cmd_line = proc.cmd().iter().map(|arg| {
        let s = arg.to_string_lossy();
        if s.contains(' ') {
            format!("\"{}\"", s)
        } else {
            s.to_string()
        }
    }).collect::<Vec<_>>().join(" ");

    let command_line = if !cmd_line.is_empty() {
        Some(cmd_line)
    } else {
        proc.exe().map(|e| e.to_string_lossy().to_string())
    };

    let is_runner = SCRIPT_RUNNERS.iter().any(|r| raw_name.eq_ignore_ascii_case(r));
    let cwd_str = proc.cwd().map(|p| sanitize_path(&p.to_string_lossy()));
    let exe_path = proc.exe().map(|e| sanitize_path(&e.to_string_lossy()));
    let category = classify_process(raw_name, exe_path.as_deref(), cwd_str.as_deref());
    let script = extract_script_name(proc.cmd(), raw_name);

    if is_runner {
        let mut project_name = None;
        if let Some(ref cwd) = cwd_str {
            project_name = extract_folder_name(cwd);
        }

        if project_name.is_none() {
            for arg in proc.cmd() {
                let arg_str = arg.to_string_lossy();
                if arg_str.contains(":\\") || arg_str.contains(":/") {
                    if let Some(p) = extract_folder_name(&arg_str) {
                        project_name = Some(p);
                        break;
                    }
                }
            }
        }

        let details = match (&cwd_str, &script) {
            (Some(cwd), Some(s)) => Some(format!("📁 {} • {}", cwd.trim_end_matches('\\'), s)),
            (Some(cwd), None) => Some(format!("📁 {}", cwd.trim_end_matches('\\'))),
            (None, Some(s)) => Some(format!("📄 {}", s)),
            (None, None) => proc.exe().map(|e| format!("📍 {}", e.to_string_lossy())),
        };

        (project_name, details, command_line, category)
    } else {
        let mut project_name = None;

        if let Some(ref exe) = exe_path {
            let lower = exe.to_lowercase();
            if lower.contains("system32") || lower.contains("syswow64") {
                project_name = Some("Sistema Windows".to_string());
            } else {
                project_name = extract_folder_name(exe);
            }
        }

        let details = if let Some(ref cwd) = cwd_str {
            let lower = cwd.to_lowercase();
            if !lower.contains("system32") && !lower.contains("windows") {
                Some(format!("📁 {}", cwd.trim_end_matches('\\')))
            } else if let Some(ref exe) = exe_path {
                Some(format!("📍 {}", exe))
            } else {
                None
            }
        } else if let Some(ref exe) = exe_path {
            Some(format!("📍 {}", exe))
        } else {
            None
        };

        (project_name, details, command_line, category)
    }
}

fn notify_startup() {
    let script = r#"
        [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
        [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
        $xml = @"
        <toast>
            <visual>
                <binding template="ToastGeneric">
                    <text>Taskvasne Ativo</text>
                    <text>Gerenciador de portas em execução na bandeja do sistema.</text>
                </binding>
            </visual>
        </toast>
"@
        $doc = New-Object Windows.Data.Xml.Dom.XmlDocument
        $doc.LoadXml($xml)
        $toast = New-Object Windows.UI.Notifications.ToastNotification $doc
        [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("Taskvasne").Show($toast)
    "#;
    let _ = Command::new("powershell")
        .args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", script])
        .creation_flags(CREATE_NO_WINDOW)
        .spawn();
}

#[tauri::command]
fn get_ports() -> Result<Vec<PortInfo>, String> {
    let mut sys = System::new();
    sys.refresh_processes_specifics(
        sysinfo::ProcessesToUpdate::All,
        true,
        sysinfo::ProcessRefreshKind::everything(),
    );

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
                let mut project_name = None;
                let mut details = None;
                let mut command_line = None;
                let mut category = "app".to_string();

                if pid > 0 {
                    if let Some(proc) = sys.process(Pid::from_u32(pid)) {
                        let raw_name = proc.name().to_string_lossy().to_string();
                        process_name = raw_name.clone();

                        let (proj, det, cmd, cat) = extract_process_details(proc, &raw_name);
                        project_name = proj;
                        details = det;
                        command_line = cmd;
                        category = cat;
                    }
                }

                results.push(PortInfo {
                    local_port: tcp_info.local_port,
                    pid,
                    process_name,
                    project_name,
                    details,
                    command_line,
                    category,
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
        let scale = monitor.scale_factor();
        let screen_size = monitor.size();
        let win_size = window.outer_size().unwrap_or(PhysicalSize::new(
            (380.0 * scale) as u32,
            (520.0 * scale) as u32,
        ));

        let margin_x = (14.0 * scale) as i32;
        // Altura padrão da barra de tarefas do Windows 11 (48px lógicos) + margem confortável de respiro (16px lógicos)
        let bottom_offset = ((48.0 + 16.0) * scale) as i32;

        let mut x = screen_size.width as i32 - win_size.width as i32 - margin_x;
        let mut y = screen_size.height as i32 - win_size.height as i32 - bottom_offset;

        if x < 0 { x = 0; }
        if y < 0 { y = 0; }

        let _ = window.set_position(Position::Physical(PhysicalPosition::new(x, y)));
    }
    let _ = window.set_always_on_top(true);
    let _ = window.show();
    let _ = window.set_focus();

    // Remove always_on_top após breve período para manter comportamento suave
    let win_clone = window.clone();
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(800));
        let _ = win_clone.set_always_on_top(false);
    });
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
    let start_instant = std::time::Instant::now();

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                show_window(&window);
            }
        }))
        .setup(move |app| {
            // Dispara notificação de inicialização para avisar que o app está ativo na bandeja
            notify_startup();

            // Setup tray icon
            let icon = app.default_window_icon().cloned().expect("default window icon missing");
            let _tray = TrayIconBuilder::new()
                .icon(icon)
                .tooltip("Taskvasne - Gerenciador de Portas")
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

            // Setup blur event to hide window when focus is lost,
            // mas protegendo os primeiros 6 segundos de inicialização para não esconder imediatamente
            if let Some(window) = app.get_webview_window("main") {
                let win_clone = window.clone();
                window.on_window_event(move |event| {
                    if let WindowEvent::Focused(false) = event {
                        if start_instant.elapsed().as_secs() >= 6 {
                            let _ = win_clone.hide();
                        }
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
    fn test_extract_folder_name() {
        assert_eq!(extract_folder_name("D:\\Agents\\"), Some("Agents".to_string()));
        assert_eq!(extract_folder_name("D:\\LinkFlix\\linkflix-lovable\\"), Some("linkflix-lovable".to_string()));
        assert_eq!(extract_folder_name("C:\\Users\\Raphael\\Projects\\awesome-app\\dist\\server.js"), Some("awesome-app".to_string()));
    }

    #[test]
    fn test_extract_script_name() {
        let cmd = vec![
            OsString::from("node.exe"),
            OsString::from("D:/Agents/system/monitoring/telemetry-server.js"),
            OsString::from("--port"),
            OsString::from("4959"),
        ];
        let script = extract_script_name(&cmd, "node.exe");
        assert_eq!(script, Some("telemetry-server.js".to_string()));
    }

    #[test]
    fn test_classify_process() {
        assert_eq!(classify_process("postgres.exe", Some("C:\\Program Files\\PostgreSQL\\16\\bin\\postgres.exe"), None), "database");
        assert_eq!(classify_process("svchost.exe", Some("C:\\Windows\\System32\\svchost.exe"), None), "system");
        assert_eq!(classify_process("vmms.exe", None, None), "system");
        assert_eq!(classify_process("node.exe", None, Some("D:\\Agents\\")), "dev");
        assert_eq!(classify_process("NitroSense.exe", Some("C:\\Program Files\\Acer\\NitroSense\\NitroSense.exe"), None), "app");
        assert_eq!(classify_process("AgentService.exe", None, None), "app");
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

