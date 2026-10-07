use std::collections::HashSet;
use std::os::windows::process::CommandExt;
use std::path::Path;
use std::process::Command;
use netstat2::*;
use serde::{Deserialize, Serialize};
use sysinfo::{Pid, System};
use tauri::{
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, PhysicalPosition, PhysicalSize, Position, WebviewWindow, WindowEvent,
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
    #[serde(rename = "Cwd")]
    pub cwd: Option<String>,
    #[serde(rename = "MemoryMb")]
    pub memory_mb: u64,
    #[serde(rename = "CpuUsage")]
    pub cpu_usage: f32,
    #[serde(rename = "IsOrphan")]
    pub is_orphan: bool,
    #[serde(rename = "DiskReadKb")]
    pub disk_read_kb: u64,
    #[serde(rename = "DiskWrittenKb")]
    pub disk_written_kb: u64,
    #[serde(rename = "Protocol")]
    pub protocol: String,
    #[serde(rename = "IconBase64")]
    pub icon_base64: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LockedProcessInfo {
    #[serde(rename = "PID")]
    pub pid: u32,
    #[serde(rename = "ProcessName")]
    pub process_name: String,
    #[serde(rename = "LockType")]
    pub lock_type: String, // "cwd" ou "handle"
    #[serde(rename = "Details")]
    pub details: Option<String>,
    #[serde(rename = "CommandLine")]
    pub command_line: Option<String>,
    #[serde(rename = "MemoryMb")]
    pub memory_mb: u64,
    #[serde(rename = "CpuUsage")]
    pub cpu_usage: f32,
    #[serde(rename = "IsSystem")]
    pub is_system: bool,
    #[serde(rename = "Cwd")]
    pub cwd: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReleaseResult {
    pub success: bool,
    pub killed_count: u32,
    pub errors: Vec<String>,
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
            } else {
                exe_path.as_ref().map(|exe| format!("📍 {}", exe))
            }
        } else {
            exe_path.as_ref().map(|exe| format!("📍 {}", exe))
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

#[cfg(target_os = "windows")]
fn notify_new_dev_port(port: u16, title: &str) {
    let clean_title = title
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', " ")
        .replace('$', "_")
        .replace('`', "_");
    let script = format!(
        r#"
        [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
        [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
        $xml = @"
        <toast>
            <visual>
                <binding template="ToastGeneric">
                    <text>Taskvasne: Porta :{port} Ativa</text>
                    <text>{clean_title} em execucao na porta {port}.</text>
                </binding>
            </visual>
        </toast>
"@
        $doc = New-Object Windows.Data.Xml.Dom.XmlDocument
        $doc.LoadXml($xml)
        $toast = New-Object Windows.UI.Notifications.ToastNotification $doc
        [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("Taskvasne").Show($toast)
        "#
    );
    let _ = Command::new("powershell")
        .args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", &script])
        .creation_flags(CREATE_NO_WINDOW)
        .spawn();
}

#[cfg(not(target_os = "windows"))]
fn notify_new_dev_port(_port: u16, _title: &str) {}

fn is_process_orphan(proc: &sysinfo::Process, sys: &System, category: &str) -> bool {
    if category != "dev" {
        return false;
    }
    match proc.parent() {
        None => true,
        Some(parent_pid) => {
            if let Some(parent_proc) = sys.process(parent_pid) {
                let parent_name = parent_proc.name().to_string_lossy().to_lowercase();
                parent_name == "services.exe"
                    || parent_name == "explorer.exe"
                    || parent_name == "svchost.exe"
            } else {
                true
            }
        }
    }
}

#[tauri::command]
fn get_ports() -> Result<Vec<PortInfo>, String> {
    #[cfg(target_os = "windows")]
    win_privilege::enable_debug_privilege();

    let mut sys = System::new();
    sys.refresh_processes_specifics(
        sysinfo::ProcessesToUpdate::All,
        true,
        sysinfo::ProcessRefreshKind::everything(),
    );

    let af_flags = AddressFamilyFlags::IPV4 | AddressFamilyFlags::IPV6;
    let proto_flags = ProtocolFlags::TCP | ProtocolFlags::UDP;
    let sockets = get_sockets_info(af_flags, proto_flags).map_err(|e| e.to_string())?;

    let mut results = Vec::new();
    let mut seen_ports = HashSet::new();

    for socket in sockets {
        let (local_port, protocol) = match socket.protocol_socket_info {
            ProtocolSocketInfo::Tcp(tcp_info) => {
                if tcp_info.state == TcpState::Listen && tcp_info.local_port > PORT_THRESHOLD {
                    (tcp_info.local_port, "TCP".to_string())
                } else {
                    continue;
                }
            }
            ProtocolSocketInfo::Udp(udp_info) => {
                if udp_info.local_port > PORT_THRESHOLD {
                    (udp_info.local_port, "UDP".to_string())
                } else {
                    continue;
                }
            }
        };

        if !seen_ports.insert((local_port, protocol.clone())) {
            continue;
        }

        let pid = socket.associated_pids.first().copied().unwrap_or(0);
        let mut process_name = "Desconhecido".to_string();
        let mut project_name = None;
        let mut details = None;
        let mut command_line = None;
        let mut category = "app".to_string();
        let mut cwd = None;
        let mut memory_mb = 0;
        let mut cpu_usage = 0.0;
        let mut is_orphan = false;
        let mut disk_read_kb = 0;
        let mut disk_written_kb = 0;
        let mut icon_base64 = None;

        if pid > 0 {
            if let Some(proc) = sys.process(Pid::from_u32(pid)) {
                let raw_name = proc.name().to_string_lossy().to_string();
                process_name = raw_name.clone();

                let (proj, det, cmd, cat) = extract_process_details(proc, &raw_name);
                project_name = proj;
                details = det;
                command_line = cmd;
                category = cat;
                cwd = proc.cwd().map(|p| sanitize_path(&p.to_string_lossy()));
                memory_mb = proc.memory() / (1024 * 1024);
                cpu_usage = proc.cpu_usage();

                let du = proc.disk_usage();
                disk_read_kb = du.read_bytes / 1024;
                disk_written_kb = du.written_bytes / 1024;
                is_orphan = is_process_orphan(proc, &sys, &category);

                #[cfg(target_os = "windows")]
                if let Some(exe) = proc.exe() {
                    icon_base64 = win_icon::get_exe_icon_base64(&exe.to_string_lossy());
                }
            }
        }

        results.push(PortInfo {
            local_port,
            protocol,
            pid,
            process_name,
            project_name,
            details,
            command_line,
            category,
            cwd,
            memory_mb,
            cpu_usage,
            is_orphan,
            disk_read_kb,
            disk_written_kb,
            icon_base64,
        });
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

    #[cfg(target_os = "windows")]
    {
        // 1. Tenta encerramento nativo ultrarrápido via Win32 TerminateProcess
        if win_process::terminate_pid_native(pid).is_ok() {
            return KillResult {
                success: true,
                error: None,
            };
        }

        // 2. Fallback via taskkill caso necessite de elevação UAC ou direitos restritos
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

    #[cfg(not(target_os = "windows"))]
    {
        let output = Command::new("kill")
            .args(["-9", &pid.to_string()])
            .output();
        match output {
            Ok(out) => KillResult {
                success: out.status.success(),
                error: if out.status.success() { None } else { Some("Falha ao finalizar processo".into()) },
            },
            Err(e) => KillResult {
                success: false,
                error: Some(e.to_string()),
            },
        }
    }
}

#[tauri::command]
fn open_external(url: String) -> Result<(), String> {
    open::that(&url).map_err(|e| e.to_string())
}

#[tauri::command]
fn open_folder(path: String) -> Result<(), String> {
    let clean = sanitize_path(&path);
    let p = Path::new(&clean);
    let target = if p.is_file() {
        p.parent().unwrap_or(p)
    } else {
        p
    };
    open::that(target).map_err(|e| e.to_string())
}

#[tauri::command]
fn kill_process_tree(pid: u32) -> KillResult {
    if pid == 0 {
        return KillResult {
            success: false,
            error: Some("PID inválido".into()),
        };
    }

    #[cfg(target_os = "windows")]
    {
        // 1. Tenta encerramento nativo da árvore via Toolhelp32Snapshot + TerminateProcess
        if win_process::terminate_process_tree_native(pid).is_ok() {
            return KillResult {
                success: true,
                error: None,
            };
        }

        // 2. Fallback via taskkill /F /T
        let output = Command::new("taskkill")
            .args(["/F", "/T", "/PID", &pid.to_string()])
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
                        error: Some(if err.is_empty() {
                            "Falha ao finalizar árvore de processos".into()
                        } else {
                            err
                        }),
                    }
                }
            }
            Err(e) => KillResult {
                success: false,
                error: Some(e.to_string()),
            },
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        kill_process(pid)
    }
}

#[tauri::command]
fn kill_process_elevated(pid: u32) -> KillResult {
    if pid == 0 {
        return KillResult {
            success: false,
            error: Some("PID inválido".into()),
        };
    }

    #[cfg(target_os = "windows")]
    {
        let ps_cmd = format!(
            "Start-Process taskkill -ArgumentList '/F','/PID','{}' -Verb RunAs -WindowStyle Hidden -Wait",
            pid
        );
        let output = Command::new("powershell")
            .args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", &ps_cmd])
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
                        error: Some(if err.is_empty() { "UAC cancelado ou falha na elevação".into() } else { err }),
                    }
                }
            }
            Err(e) => KillResult {
                success: false,
                error: Some(e.to_string()),
            },
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        kill_process(pid)
    }
}

#[tauri::command]
fn open_in_vscode(path: String) -> Result<(), String> {
    let clean = sanitize_path(&path);
    let p = Path::new(&clean);
    let target = if p.is_file() {
        p.parent().unwrap_or(p)
    } else {
        p
    };

    if !target.exists() {
        return Err("Caminho não existe".into());
    }

    #[cfg(target_os = "windows")]
    {
        let res = Command::new("cmd")
            .args(["/c", &format!("code \"{}\"", target.to_string_lossy())])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn();

        res.map(|_| ()).map_err(|e| format!("Erro ao abrir VS Code: {e}"))
    }

    #[cfg(not(target_os = "windows"))]
    {
        Command::new("code")
            .arg(&target.to_string_lossy())
            .spawn()
            .map(|_| ())
            .map_err(|e| format!("Erro ao abrir VS Code: {e}"))
    }
}

#[tauri::command]
fn open_in_terminal(path: String) -> Result<(), String> {
    let clean = sanitize_path(&path);
    let p = Path::new(&clean);
    let target = if p.is_file() {
        p.parent().unwrap_or(p)
    } else {
        p
    };

    if !target.exists() {
        return Err("Caminho não existe".into());
    }

    #[cfg(target_os = "windows")]
    {
        let target_str = target.to_string_lossy();
        let wt_res = Command::new("wt.exe")
            .args(["-d", &target_str])
            .spawn();

        if wt_res.is_err() {
            let escaped_path = target_str.replace('\'', "''");
            Command::new("powershell.exe")
                .args(["-NoExit", "-Command", &format!("Set-Location -LiteralPath '{}'", escaped_path)])
                .spawn()
                .map(|_| ())
                .map_err(|e| format!("Erro ao abrir Terminal: {e}"))
        } else {
            Ok(())
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        Command::new("x-terminal-emulator")
            .arg(&target.to_string_lossy())
            .spawn()
            .map(|_| ())
            .map_err(|e| format!("Erro ao abrir Terminal: {e}"))
    }
}

#[tauri::command]
fn kill_all_dev() -> Result<u32, String> {
    let ports = get_ports()?;
    let mut killed_pids = HashSet::new();
    let mut count = 0;

    for port in ports {
        if port.category == "dev" && port.pid > 0 && killed_pids.insert(port.pid) {
            let res = kill_process(port.pid);
            if res.success {
                count += 1;
            }
        }
    }

    Ok(count)
}

#[tauri::command]
fn kill_all_orphans() -> KillResult {
    let mut sys = System::new();
    sys.refresh_processes_specifics(
        sysinfo::ProcessesToUpdate::All,
        true,
        sysinfo::ProcessRefreshKind::everything(),
    );

    let af_flags = AddressFamilyFlags::IPV4 | AddressFamilyFlags::IPV6;
    let proto_flags = ProtocolFlags::TCP;
    let sockets = match get_sockets_info(af_flags, proto_flags) {
        Ok(s) => s,
        Err(e) => return KillResult { success: false, error: Some(e.to_string()) },
    };

    let mut killed = 0;
    let mut errors = Vec::new();
    let mut seen_pids = HashSet::new();

    for socket in sockets {
        if let ProtocolSocketInfo::Tcp(tcp_info) = socket.protocol_socket_info {
            if tcp_info.state == TcpState::Listen && tcp_info.local_port > PORT_THRESHOLD {
                let pid = socket.associated_pids.first().copied().unwrap_or(0);
                if pid > 0 && seen_pids.insert(pid) {
                    if let Some(proc) = sys.process(Pid::from_u32(pid)) {
                        let raw_name = proc.name().to_string_lossy().to_string();
                        let (_, _, _, category) = extract_process_details(proc, &raw_name);
                        if is_process_orphan(proc, &sys, &category) {
                            let res = kill_process_tree(pid);
                            if res.success {
                                killed += 1;
                            } else if let Some(err) = res.error {
                                errors.push(err);
                            }
                        }
                    }
                }
            }
        }
    }

    if errors.is_empty() {
        KillResult { success: true, error: None }
    } else {
        KillResult {
            success: killed > 0,
            error: Some(format!("Encerrados: {killed}. Falhas: {}", errors.join("; "))),
        }
    }
}

#[tauri::command]
fn get_local_ip() -> Result<String, String> {
    use std::net::UdpSocket;
    let socket = UdpSocket::bind("0.0.0.0:0").map_err(|e| e.to_string())?;
    socket.connect("8.8.8.8:80").map_err(|e| e.to_string())?;
    let local_addr = socket.local_addr().map_err(|e| e.to_string())?;
    Ok(local_addr.ip().to_string())
}

#[cfg(target_os = "windows")]
mod win_privilege {
    use std::sync::atomic::{AtomicBool, Ordering};

    static PRIVILEGE_ENABLED: AtomicBool = AtomicBool::new(false);

    #[repr(C)]
    #[derive(Clone, Copy)]
    struct LUID {
        low_part: u32,
        high_part: i32,
    }

    #[repr(C)]
    #[derive(Clone, Copy)]
    struct LUID_AND_ATTRIBUTES {
        luid: LUID,
        attributes: u32,
    }

    #[repr(C)]
    struct TOKEN_PRIVILEGES {
        privilege_count: u32,
        privileges: [LUID_AND_ATTRIBUTES; 1],
    }

    const TOKEN_ADJUST_PRIVILEGES: u32 = 0x0020;
    const TOKEN_QUERY: u32 = 0x0008;
    const SE_PRIVILEGE_ENABLED: u32 = 0x00000002;

    #[link(name = "advapi32")]
    extern "system" {
        fn OpenProcessToken(process_handle: isize, desired_access: u32, token_handle: *mut isize) -> i32;
        fn LookupPrivilegeValueW(lp_system_name: *const u16, lp_name: *const u16, lp_luid: *mut LUID) -> i32;
        fn AdjustTokenPrivileges(
            token_handle: isize,
            disable_all_privileges: i32,
            new_state: *const TOKEN_PRIVILEGES,
            buffer_length: u32,
            previous_state: *mut TOKEN_PRIVILEGES,
            return_length: *mut u32,
        ) -> i32;
    }

    #[link(name = "kernel32")]
    extern "system" {
        fn GetCurrentProcess() -> isize;
        fn CloseHandle(handle: isize) -> i32;
    }

    pub fn enable_debug_privilege() -> bool {
        if PRIVILEGE_ENABLED.load(Ordering::Relaxed) {
            return true;
        }

        unsafe {
            let mut token: isize = 0;
            let current_process = GetCurrentProcess();
            if OpenProcessToken(current_process, TOKEN_ADJUST_PRIVILEGES | TOKEN_QUERY, &mut token) == 0 {
                return false;
            }

            // UTF-16 null-terminated "SeDebugPrivilege"
            let privilege_name: [u16; 17] = [
                'S' as u16, 'e' as u16, 'D' as u16, 'e' as u16, 'b' as u16, 'u' as u16, 'g' as u16,
                'P' as u16, 'r' as u16, 'i' as u16, 'v' as u16, 'i' as u16, 'l' as u16, 'e' as u16,
                'g' as u16, 'e' as u16, 0,
            ];

            let mut luid = LUID { low_part: 0, high_part: 0 };
            if LookupPrivilegeValueW(std::ptr::null(), privilege_name.as_ptr(), &mut luid) == 0 {
                CloseHandle(token);
                return false;
            }

            let tp = TOKEN_PRIVILEGES {
                privilege_count: 1,
                privileges: [LUID_AND_ATTRIBUTES {
                    luid,
                    attributes: SE_PRIVILEGE_ENABLED,
                }],
            };

            let res = AdjustTokenPrivileges(
                token,
                0,
                &tp,
                std::mem::size_of::<TOKEN_PRIVILEGES>() as u32,
                std::ptr::null_mut(),
                std::ptr::null_mut(),
            );

            CloseHandle(token);

            let success = res != 0;
            if success {
                PRIVILEGE_ENABLED.store(true, Ordering::Relaxed);
            }
            success
        }
    }
}

#[cfg(target_os = "windows")]
mod win_process {
    use std::collections::{HashSet, VecDeque};

    const PROCESS_TERMINATE: u32 = 0x0001;
    const TH32CS_SNAPPROCESS: u32 = 0x00000002;
    const INVALID_HANDLE_VALUE: isize = -1;

    #[repr(C)]
    struct PROCESSENTRY32W {
        dw_size: u32,
        cnt_usage: u32,
        th32_process_id: u32,
        th32_default_heap_id: usize,
        th32_module_id: u32,
        cnt_threads: u32,
        th32_parent_process_id: u32,
        pc_pri_class_base: i32,
        dw_flags: u32,
        sz_exe_file: [u16; 260],
    }

    #[link(name = "kernel32")]
    extern "system" {
        fn OpenProcess(desired_access: u32, inherit_handle: i32, process_id: u32) -> isize;
        fn TerminateProcess(process_handle: isize, exit_code: u32) -> i32;
        fn CloseHandle(handle: isize) -> i32;
        fn CreateToolhelp32Snapshot(flags: u32, process_id: u32) -> isize;
        fn Process32FirstW(snapshot: isize, entry: *mut PROCESSENTRY32W) -> i32;
        fn Process32NextW(snapshot: isize, entry: *mut PROCESSENTRY32W) -> i32;
        fn GetLastError() -> u32;
    }

    pub fn terminate_pid_native(pid: u32) -> Result<(), String> {
        unsafe {
            let handle = OpenProcess(PROCESS_TERMINATE, 0, pid);
            if handle == 0 || handle == INVALID_HANDLE_VALUE {
                let err = GetLastError();
                return Err(format!("Falha ao abrir processo {pid}: código Win32 {err}"));
            }

            let terminated = TerminateProcess(handle, 1);
            let err = if terminated == 0 { GetLastError() } else { 0 };
            CloseHandle(handle);

            if terminated != 0 {
                Ok(())
            } else {
                Err(format!("Falha ao finalizar processo {pid}: código Win32 {err}"))
            }
        }
    }

    pub fn terminate_process_tree_native(root_pid: u32) -> Result<(), String> {
        let descendants = get_process_descendants(root_pid);

        // Mata os processos filhos em ordem reversa (folhas primeiro)
        for &child_pid in descendants.iter().rev() {
            let _ = terminate_pid_native(child_pid);
        }

        // Mata o processo raiz
        terminate_pid_native(root_pid)
    }

    fn get_process_descendants(root_pid: u32) -> Vec<u32> {
        let mut descendants = Vec::new();
        unsafe {
            let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
            if snapshot == 0 || snapshot == INVALID_HANDLE_VALUE {
                return descendants;
            }

            let mut entry = PROCESSENTRY32W {
                dw_size: std::mem::size_of::<PROCESSENTRY32W>() as u32,
                cnt_usage: 0,
                th32_process_id: 0,
                th32_default_heap_id: 0,
                th32_module_id: 0,
                cnt_threads: 0,
                th32_parent_process_id: 0,
                pc_pri_class_base: 0,
                dw_flags: 0,
                sz_exe_file: [0; 260],
            };

            let mut pairs = Vec::new();
            if Process32FirstW(snapshot, &mut entry) != 0 {
                loop {
                    pairs.push((entry.th32_process_id, entry.th32_parent_process_id));
                    if Process32NextW(snapshot, &mut entry) == 0 {
                        break;
                    }
                }
            }
            CloseHandle(snapshot);

            // BFS para coletar todos os descendentes
            let mut queue = VecDeque::new();
            let mut visited = HashSet::new();
            queue.push_back(root_pid);
            visited.insert(root_pid);

            while let Some(parent) = queue.pop_front() {
                for &(child_pid, child_parent) in &pairs {
                    if child_parent == parent && child_pid > 0 && visited.insert(child_pid) {
                        descendants.push(child_pid);
                        queue.push_back(child_pid);
                    }
                }
            }
        }
        descendants
    }
}

#[cfg(target_os = "windows")]
mod win_icon {
    use std::collections::HashMap;
    use std::os::windows::ffi::OsStrExt;
    use std::path::Path;
    use std::sync::Mutex;

    static ICON_CACHE: Mutex<Option<HashMap<String, String>>> = Mutex::new(None);

    #[repr(C)]
    struct SHFILEINFOW {
        h_icon: isize,
        i_icon: i32,
        dw_attributes: u32,
        sz_display_name: [u16; 260],
        sz_type_name: [u16; 80],
    }

    #[repr(C)]
    struct ICONINFO {
        f_icon: i32,
        x_hotspot: u32,
        y_hotspot: u32,
        hbm_mask: isize,
        hbm_color: isize,
    }

    #[repr(C)]
    struct BITMAP {
        bm_type: i32,
        bm_width: i32,
        bm_height: i32,
        bm_width_bytes: i32,
        bm_planes: u16,
        bm_bits_pixel: u16,
        bm_bits: *mut u8,
    }

    #[repr(C)]
    struct BITMAPINFOHEADER {
        bi_size: u32,
        bi_width: i32,
        bi_height: i32,
        bi_planes: u16,
        bi_bit_count: u16,
        bi_compression: u32,
        bi_size_image: u32,
        bi_x_pels_per_meter: i32,
        bi_y_pels_per_meter: i32,
        bi_clr_used: u32,
        bi_clr_important: u32,
    }

    #[repr(C)]
    struct BITMAPINFO {
        bmi_header: BITMAPINFOHEADER,
        bmi_colors: [u32; 1],
    }

    const SHGFI_ICON: u32 = 0x000000100;
    const SHGFI_SMALLICON: u32 = 0x000000001;
    const DIB_RGB_COLORS: u32 = 0;

    #[link(name = "shell32")]
    extern "system" {
        fn SHGetFileInfoW(
            psz_path: *const u16,
            dw_file_attributes: u32,
            psfi: *mut SHFILEINFOW,
            cb_file_info: u32,
            u_flags: u32,
        ) -> usize;
    }

    #[link(name = "user32")]
    extern "system" {
        fn DestroyIcon(h_icon: isize) -> i32;
        fn GetIconInfo(h_icon: isize, p_icon_info: *mut ICONINFO) -> i32;
    }

    #[link(name = "gdi32")]
    extern "system" {
        fn DeleteObject(ho: isize) -> i32;
        fn GetObjectW(h: isize, c: i32, pv: *mut std::ffi::c_void) -> i32;
        fn CreateCompatibleDC(hdc: isize) -> isize;
        fn DeleteDC(hdc: isize) -> i32;
        fn GetDIBits(
            hdc: isize,
            hbm: isize,
            start: u32,
            lines: u32,
            lpv_bits: *mut u8,
            lpbmi: *mut BITMAPINFO,
            usage: u32,
        ) -> i32;
    }

    const BASE64_ALPHABET: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    fn to_base64(data: &[u8]) -> String {
        let mut result = String::with_capacity((data.len() + 2) / 3 * 4);
        for chunk in data.chunks(3) {
            let b0 = chunk[0] as u32;
            let b1 = if chunk.len() > 1 { chunk[1] as u32 } else { 0 };
            let b2 = if chunk.len() > 2 { chunk[2] as u32 } else { 0 };

            let triple = (b0 << 16) | (b1 << 8) | b2;

            result.push(BASE64_ALPHABET[((triple >> 18) & 0x3F) as usize] as char);
            result.push(BASE64_ALPHABET[((triple >> 12) & 0x3F) as usize] as char);

            if chunk.len() > 1 {
                result.push(BASE64_ALPHABET[((triple >> 6) & 0x3F) as usize] as char);
            } else {
                result.push('=');
            }

            if chunk.len() > 2 {
                result.push(BASE64_ALPHABET[(triple & 0x3F) as usize] as char);
            } else {
                result.push('=');
            }
        }
        result
    }

    pub fn get_exe_icon_base64(exe_path: &str) -> Option<String> {
        let p = Path::new(exe_path);
        if !p.exists() {
            return None;
        }

        let key = exe_path.to_lowercase();
        {
            let mut cache = ICON_CACHE.lock().unwrap();
            let map = cache.get_or_insert_with(HashMap::new);
            if let Some(cached) = map.get(&key) {
                return Some(cached.clone());
            }
        }

        let wide_path: Vec<u16> = p.as_os_str().encode_wide().chain(std::iter::once(0)).collect();

        unsafe {
            let mut sfi = SHFILEINFOW {
                h_icon: 0,
                i_icon: 0,
                dw_attributes: 0,
                sz_display_name: [0; 260],
                sz_type_name: [0; 80],
            };

            let res = SHGetFileInfoW(
                wide_path.as_ptr(),
                0,
                &mut sfi,
                std::mem::size_of::<SHFILEINFOW>() as u32,
                SHGFI_ICON | SHGFI_SMALLICON,
            );

            if res == 0 || sfi.h_icon == 0 {
                return None;
            }

            let mut icon_info = ICONINFO {
                f_icon: 0,
                x_hotspot: 0,
                y_hotspot: 0,
                hbm_mask: 0,
                hbm_color: 0,
            };

            if GetIconInfo(sfi.h_icon, &mut icon_info) == 0 {
                DestroyIcon(sfi.h_icon);
                return None;
            }

            let mut bmp = BITMAP {
                bm_type: 0,
                bm_width: 0,
                bm_height: 0,
                bm_width_bytes: 0,
                bm_planes: 0,
                bm_bits_pixel: 0,
                bm_bits: std::ptr::null_mut(),
            };

            let color_bm = if icon_info.hbm_color != 0 {
                icon_info.hbm_color
            } else {
                icon_info.hbm_mask
            };

            if GetObjectW(color_bm, std::mem::size_of::<BITMAP>() as i32, &mut bmp as *mut _ as *mut _) == 0 {
                if icon_info.hbm_color != 0 { DeleteObject(icon_info.hbm_color); }
                if icon_info.hbm_mask != 0 { DeleteObject(icon_info.hbm_mask); }
                DestroyIcon(sfi.h_icon);
                return None;
            }

            let width = bmp.bm_width;
            let height = bmp.bm_height;
            if width <= 0 || height <= 0 || width > 64 || height > 64 {
                if icon_info.hbm_color != 0 { DeleteObject(icon_info.hbm_color); }
                if icon_info.hbm_mask != 0 { DeleteObject(icon_info.hbm_mask); }
                DestroyIcon(sfi.h_icon);
                return None;
            }

            let hdc = CreateCompatibleDC(0);
            let mut bmi = BITMAPINFO {
                bmi_header: BITMAPINFOHEADER {
                    bi_size: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                    bi_width: width,
                    bi_height: height,
                    bi_planes: 1,
                    bi_bit_count: 32,
                    bi_compression: 0,
                    bi_size_image: (width * height * 4) as u32,
                    bi_x_pels_per_meter: 0,
                    bi_y_pels_per_meter: 0,
                    bi_clr_used: 0,
                    bi_clr_important: 0,
                },
                bmi_colors: [0; 1],
            };

            let mut pixels: Vec<u8> = vec![0; (width * height * 4) as usize];
            let dib_res = GetDIBits(
                hdc,
                color_bm,
                0,
                height as u32,
                pixels.as_mut_ptr(),
                &mut bmi,
                DIB_RGB_COLORS,
            );
            DeleteDC(hdc);

            if icon_info.hbm_color != 0 { DeleteObject(icon_info.hbm_color); }
            if icon_info.hbm_mask != 0 { DeleteObject(icon_info.hbm_mask); }
            DestroyIcon(sfi.h_icon);

            if dib_res == 0 {
                return None;
            }

            // Normalização de canal Alpha: se nenhum pixel tiver alpha != 0 (ícones Win32 legados
            // sem canal alpha explícito), define alpha = 255 para evitar que o WebView trate como invisível
            let has_alpha = pixels.chunks(4).any(|c| c.len() == 4 && c[3] != 0);
            if !has_alpha {
                for c in pixels.chunks_mut(4) {
                    if c.len() == 4 {
                        c[3] = 255;
                    }
                }
            }

            // Monta BITMAPFILEHEADER (14 bytes) + BITMAPINFOHEADER (40 bytes) + pixels
            let file_header_size = 14usize;
            let info_header_size = 40usize;
            let total_size = file_header_size + info_header_size + pixels.len();

            let mut bmp_data = Vec::with_capacity(total_size);
            bmp_data.extend_from_slice(b"BM");
            bmp_data.extend_from_slice(&(total_size as u32).to_le_bytes());
            bmp_data.extend_from_slice(&[0u8; 4]);
            bmp_data.extend_from_slice(&((file_header_size + info_header_size) as u32).to_le_bytes());

            bmp_data.extend_from_slice(&40u32.to_le_bytes());
            bmp_data.extend_from_slice(&(width as i32).to_le_bytes());
            bmp_data.extend_from_slice(&(height as i32).to_le_bytes());
            bmp_data.extend_from_slice(&1u16.to_le_bytes());
            bmp_data.extend_from_slice(&32u16.to_le_bytes());
            bmp_data.extend_from_slice(&0u32.to_le_bytes());
            bmp_data.extend_from_slice(&(pixels.len() as u32).to_le_bytes());
            bmp_data.extend_from_slice(&0u32.to_le_bytes());
            bmp_data.extend_from_slice(&0u32.to_le_bytes());
            bmp_data.extend_from_slice(&0u32.to_le_bytes());
            bmp_data.extend_from_slice(&0u32.to_le_bytes());
            bmp_data.extend_from_slice(&pixels);

            let base64_str = format!("data:image/bmp;base64,{}", to_base64(&bmp_data));

            {
                let mut cache = ICON_CACHE.lock().unwrap();
                let map = cache.get_or_insert_with(HashMap::new);
                map.insert(key, base64_str.clone());
            }

            Some(base64_str)
        }
    }
}

#[cfg(target_os = "windows")]
mod restart_manager {
    use std::os::windows::ffi::OsStrExt;
    use std::path::Path;

    #[repr(C)]
    #[derive(Clone, Copy)]
    #[allow(non_snake_case, clippy::upper_case_acronyms)]
    struct FILETIME {
        dwLowDateTime: u32,
        dwHighDateTime: u32,
    }

    #[repr(C)]
    #[derive(Clone, Copy)]
    #[allow(non_snake_case, clippy::upper_case_acronyms)]
    struct RM_UNIQUE_PROCESS {
        dwProcessId: u32,
        ProcessStartTime: FILETIME,
    }

    const CCH_RM_MAX_APP_NAME: usize = 255;
    const CCH_RM_MAX_SVC_NAME: usize = 63;
    const CCH_RM_SESSION_KEY: usize = 32;

    #[repr(C)]
    #[allow(non_snake_case, clippy::upper_case_acronyms)]
    struct RM_PROCESS_INFO {
        Process: RM_UNIQUE_PROCESS,
        strAppName: [u16; CCH_RM_MAX_APP_NAME + 1],
        strServiceShortName: [u16; CCH_RM_MAX_SVC_NAME + 1],
        ApplicationType: u32,
        AppStatus: u32,
        TSSessionId: u32,
        bRestartable: i32,
    }

    #[link(name = "rstrtmgr")]
    extern "system" {
        fn RmStartSession(
            pSessionHandle: *mut u32,
            dwSessionFlags: u32,
            strSessionKey: *mut u16,
        ) -> u32;

        fn RmRegisterResources(
            dwSessionHandle: u32,
            nFiles: u32,
            rgsFilenames: *const *const u16,
            nApplications: u32,
            rgApplications: *const std::ffi::c_void,
            nServices: u32,
            rgsServiceNames: *const *const u16,
        ) -> u32;

        fn RmGetList(
            dwSessionHandle: u32,
            pnProcInfoNeeded: *mut u32,
            pnProcInfo: *mut u32,
            rgAffectedApps: *mut RM_PROCESS_INFO,
            lpdwRebootReasons: *mut u32,
        ) -> u32;

        fn RmEndSession(dwSessionHandle: u32) -> u32;
    }

    pub fn get_locking_pids(path: &Path) -> Vec<u32> {
        let mut pids = Vec::new();
        let wide_path: Vec<u16> = path.as_os_str().encode_wide().chain(std::iter::once(0)).collect();

        unsafe {
            let mut session_handle: u32 = 0;
            let mut session_key = [0u16; CCH_RM_SESSION_KEY + 1];

            if RmStartSession(&mut session_handle, 0, session_key.as_mut_ptr()) != 0 {
                return pids;
            }

            let path_ptr = wide_path.as_ptr();
            let reg_res = RmRegisterResources(
                session_handle,
                1,
                &path_ptr,
                0,
                std::ptr::null(),
                0,
                std::ptr::null(),
            );

            if reg_res == 0 {
                let mut n_needed: u32 = 0;
                let mut n_proc_info: u32 = 0;
                let mut reboot_reasons: u32 = 0;

                let _ = RmGetList(
                    session_handle,
                    &mut n_needed,
                    &mut n_proc_info,
                    std::ptr::null_mut(),
                    &mut reboot_reasons,
                );

                if n_needed > 0 {
                    let mut proc_infos: Vec<RM_PROCESS_INFO> = Vec::with_capacity(n_needed as usize);
                    n_proc_info = n_needed;
                    let list_res = RmGetList(
                        session_handle,
                        &mut n_needed,
                        &mut n_proc_info,
                        proc_infos.as_mut_ptr(),
                        &mut reboot_reasons,
                    );

                    if list_res == 0 {
                        proc_infos.set_len(n_proc_info as usize);
                        for info in proc_infos {
                            if info.Process.dwProcessId > 0 {
                                pids.push(info.Process.dwProcessId);
                            }
                        }
                    }
                }
            }

            let _ = RmEndSession(session_handle);
        }

        pids
    }
}

#[cfg(not(target_os = "windows"))]
mod restart_manager {
    use std::path::Path;
    pub fn get_locking_pids(_path: &Path) -> Vec<u32> {
        Vec::new()
    }
}

#[tauri::command]
fn inspect_locked_path(path_str: String) -> Result<Vec<LockedProcessInfo>, String> {
    let clean = sanitize_path(&path_str);
    if clean.trim().is_empty() {
        return Err("Caminho não fornecido".to_string());
    }

    let target_path = Path::new(&clean);
    let target_lower = clean.to_lowercase().trim_end_matches('\\').to_string();

    let mut sys = System::new();
    sys.refresh_processes_specifics(
        sysinfo::ProcessesToUpdate::All,
        true,
        sysinfo::ProcessRefreshKind::everything(),
    );

    let mut found_pids: std::collections::HashMap<u32, String> = std::collections::HashMap::new();

    // 1. Usar Restart Manager API para handles de arquivos e diretórios
    let rm_pids = restart_manager::get_locking_pids(target_path);
    for pid in rm_pids {
        found_pids.insert(pid, "handle".to_string());
    }

    // 2. Verificar processos cujo CWD ou executável esteja dentro da pasta
    for (pid, proc) in sys.processes() {
        let u_pid = pid.as_u32();
        if found_pids.contains_key(&u_pid) {
            continue;
        }

        let mut matches = false;
        if let Some(cwd) = proc.cwd() {
            let cwd_lower = sanitize_path(&cwd.to_string_lossy()).to_lowercase();
            let cwd_clean = cwd_lower.trim_end_matches('\\').to_string();
            if cwd_clean == target_lower || cwd_clean.starts_with(&format!("{}\\", target_lower)) {
                matches = true;
            }
        }

        if !matches {
            if let Some(exe) = proc.exe() {
                let exe_lower = sanitize_path(&exe.to_string_lossy()).to_lowercase();
                if exe_lower.starts_with(&format!("{}\\", target_lower)) {
                    matches = true;
                }
            }
        }

        if matches {
            found_pids.insert(u_pid, "cwd".to_string());
        }
    }

    let mut results = Vec::new();
    for (pid, lock_type) in found_pids {
        if pid == 0 {
            continue;
        }

        if let Some(proc) = sys.process(Pid::from_u32(pid)) {
            let raw_name = proc.name().to_string_lossy().to_string();
            let (proj, det, cmd, cat) = extract_process_details(proc, &raw_name);
            let memory_mb = proc.memory() / (1024 * 1024);
            let cpu_usage = proc.cpu_usage();
            let is_system = cat == "system";
            let cwd = proc.cwd().map(|p| sanitize_path(&p.to_string_lossy()));

            let details = det.or(proj);

            results.push(LockedProcessInfo {
                pid,
                process_name: raw_name,
                lock_type,
                details,
                command_line: cmd,
                memory_mb,
                cpu_usage,
                is_system,
                cwd,
            });
        } else {
            results.push(LockedProcessInfo {
                pid,
                process_name: "Processo Finalizado ou Desconhecido".to_string(),
                lock_type,
                details: None,
                command_line: None,
                memory_mb: 0,
                cpu_usage: 0.0,
                is_system: false,
                cwd: None,
            });
        }
    }

    results.sort_by_key(|p| p.pid);
    Ok(results)
}

#[tauri::command]
fn release_locked_path(path_str: String) -> Result<ReleaseResult, String> {
    let locked = inspect_locked_path(path_str)?;
    let mut killed_count = 0;
    let mut errors = Vec::new();

    for proc in locked {
        let res = kill_process(proc.pid);
        if res.success {
            killed_count += 1;
        } else if let Some(e) = res.error {
            errors.push(format!("PID {}: {}", proc.pid, e));
        }
    }

    Ok(ReleaseResult {
        success: errors.is_empty(),
        killed_count,
        errors,
    })
}

#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}

#[cfg(target_os = "windows")]
fn get_windows_work_area() -> Option<(i32, i32, i32, i32)> {
    #[repr(C)]
    #[allow(clippy::upper_case_acronyms)]
    struct RECT {
        left: i32,
        top: i32,
        right: i32,
        bottom: i32,
    }
    extern "system" {
        fn SystemParametersInfoW(
            uiAction: u32,
            uiParam: u32,
            pvParam: *mut std::ffi::c_void,
            fWinIni: u32,
        ) -> i32;
    }
    let mut rect = RECT { left: 0, top: 0, right: 0, bottom: 0 };
    let ok = unsafe {
        SystemParametersInfoW(
            0x0030, // SPI_GETWORKAREA
            0,
            &mut rect as *mut _ as *mut std::ffi::c_void,
            0,
        )
    };
    if ok != 0 {
        Some((rect.left, rect.top, rect.right, rect.bottom))
    } else {
        None
    }
}

fn show_window(window: &WebviewWindow) {
    if let Ok(Some(monitor)) = window.primary_monitor() {
        let scale = monitor.scale_factor();
        let win_size = window.outer_size().unwrap_or(PhysicalSize::new(
            (410.0 * scale) as u32,
            (580.0 * scale) as u32,
        ));

        let margin_x = (14.0 * scale) as i32;
        let margin_y = (3.0 * scale) as i32; // Colado na barra de tarefas

        #[cfg(target_os = "windows")]
        let (pos_x, pos_y) = if let Some((_, _, right, bottom)) = get_windows_work_area() {
            // SPI_GETWORKAREA desconta pixel-perfect a barra de tarefas do Windows
            let x = right - win_size.width as i32 - margin_x;
            let y = bottom - win_size.height as i32 - margin_y;
            (x, y)
        } else {
            let screen_size = monitor.size();
            let bottom_offset = ((48.0 + 3.0) * scale) as i32;
            let x = screen_size.width as i32 - win_size.width as i32 - margin_x;
            let y = screen_size.height as i32 - win_size.height as i32 - bottom_offset;
            (x, y)
        };

        #[cfg(not(target_os = "windows"))]
        let (pos_x, pos_y) = {
            let screen_size = monitor.size();
            let bottom_offset = ((48.0 + 3.0) * scale) as i32;
            let x = screen_size.width as i32 - win_size.width as i32 - margin_x;
            let y = screen_size.height as i32 - win_size.height as i32 - bottom_offset;
            (x, y)
        };

        let final_x = pos_x.max(0);
        let final_y = pos_y.max(0);

        let _ = window.set_position(Position::Physical(PhysicalPosition::new(final_x, final_y)));
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

    #[cfg(target_os = "windows")]
    win_privilege::enable_debug_privilege();

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

            // Background delta socket watcher para atualização instantânea em tempo real com zero CPU idle
            let app_handle = app.handle().clone();
            std::thread::spawn(move || {
                let mut last_sig: Vec<(u16, u32)> = Vec::new();
                loop {
                    std::thread::sleep(std::time::Duration::from_millis(1500));

                    let af_flags = AddressFamilyFlags::IPV4 | AddressFamilyFlags::IPV6;
                    let proto_flags = ProtocolFlags::TCP | ProtocolFlags::UDP;
                    if let Ok(sockets) = get_sockets_info(af_flags, proto_flags) {
                        let mut current_sig: Vec<(u16, u32)> = sockets
                            .into_iter()
                            .filter_map(|s| {
                                match s.protocol_socket_info {
                                    ProtocolSocketInfo::Tcp(tcp_info) => {
                                        if tcp_info.state == TcpState::Listen && tcp_info.local_port > PORT_THRESHOLD {
                                            let pid = s.associated_pids.first().copied().unwrap_or(0);
                                            Some((tcp_info.local_port, pid))
                                        } else {
                                            None
                                        }
                                    }
                                    ProtocolSocketInfo::Udp(udp_info) => {
                                        if udp_info.local_port > PORT_THRESHOLD {
                                            let pid = s.associated_pids.first().copied().unwrap_or(0);
                                            Some((udp_info.local_port, pid))
                                        } else {
                                            None
                                        }
                                    }
                                }
                            })
                            .collect();
                        current_sig.sort_unstable();
                        current_sig.dedup();

                        if current_sig != last_sig {
                            if let Ok(ports) = get_ports() {
                                if !last_sig.is_empty() {
                                    for p in &ports {
                                        if p.category == "dev" && !last_sig.iter().any(|(port, _)| *port == p.local_port) {
                                            let title = p.project_name.as_deref().unwrap_or(&p.process_name);
                                            notify_new_dev_port(p.local_port, title);
                                        }
                                    }
                                }
                                last_sig = current_sig;
                                let _ = app_handle.emit("ports-changed", ports);
                            }
                        }
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_ports,
            kill_process,
            kill_process_tree,
            kill_process_elevated,
            kill_all_dev,
            kill_all_orphans,
            get_local_ip,
            open_external,
            open_folder,
            open_in_vscode,
            open_in_terminal,
            inspect_locked_path,
            release_locked_path,
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

    #[test]
    fn test_inspect_locked_path_empty() {
        let res = inspect_locked_path("".to_string());
        assert!(res.is_err());
        assert_eq!(res.unwrap_err(), "Caminho não fornecido".to_string());
    }

    #[test]
    fn test_inspect_locked_path_valid() {
        let cwd = std::env::current_dir().unwrap();
        let res = inspect_locked_path(cwd.to_string_lossy().to_string());
        assert!(res.is_ok());
    }

    #[test]
    fn test_get_local_ip() {
        // Se a máquina estiver online, deve retornar um IP válido; se offline, mapeia o erro
        let ip_res = get_local_ip();
        if let Ok(ip) = ip_res {
            assert!(!ip.is_empty());
        }
    }

    #[test]
    fn test_is_process_orphan_non_dev() {
        let mut sys = System::new();
        sys.refresh_processes_specifics(
            sysinfo::ProcessesToUpdate::All,
            true,
            sysinfo::ProcessRefreshKind::nothing(),
        );
        if let Some((_, proc)) = sys.processes().iter().next() {
            assert!(!is_process_orphan(proc, &sys, "system"));
            assert!(!is_process_orphan(proc, &sys, "database"));
            assert!(!is_process_orphan(proc, &sys, "app"));
        }
    }

    #[test]
    #[cfg(target_os = "windows")]
    fn test_enable_debug_privilege() {
        let _ = win_privilege::enable_debug_privilege();
    }

    #[test]
    fn test_kill_process_elevated_invalid_pid() {
        let res = kill_process_elevated(0);
        assert!(!res.success);
        assert_eq!(res.error, Some("PID inválido".to_string()));
    }
}

