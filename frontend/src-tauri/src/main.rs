// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use reqwest::Client;
use std::collections::HashMap;
use std::process::Command;
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::Manager;
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;
use tokio::time::sleep;

fn now_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0)
}

macro_rules! log_info {
    ($target:expr, $($arg:tt)*) => {
        println!("[{}] [INFO ] [{}] {}", now_ms(), $target, format!($($arg)*));
    };
}

macro_rules! log_warn {
    ($target:expr, $($arg:tt)*) => {
        println!("[{}] [WARN ] [{}] {}", now_ms(), $target, format!($($arg)*));
    };
}

macro_rules! log_error {
    ($target:expr, $($arg:tt)*) => {
        eprintln!("[{}] [ERROR] [{}] {}", now_ms(), $target, format!($($arg)*));
    };
}

// ==============================
// Sidecar State (Multi-backend)
// ==============================
struct SidecarState {
    children: Mutex<HashMap<String, CommandChild>>,
}

// ==============================
// Backend Config
// ==============================
#[derive(Clone)]
struct BackendConfig {
    name: String,
    exe: String,
    args: Vec<String>,
    health_check_url: Option<String>,
    shutdown_url: Option<String>,
}

struct BackendsState {
    configs: Vec<BackendConfig>,
}

// ==============================
// Windows fallback killer
// ==============================
fn kill_process_tree_windows(backend_name: &str, pid: u32) {
    log_info!(
        "cleanup",
        "Issuing taskkill for backend '{}' (PID {})",
        backend_name,
        pid
    );

    match Command::new("taskkill")
        .args(["/F", "/T", "/PID", &pid.to_string()])
        .output()
    {
        Ok(output) if output.status.success() => {
            log_info!(
                "cleanup",
                "taskkill succeeded for backend '{}' (PID {})",
                backend_name,
                pid
            );
        }
        Ok(output) => {
            log_error!(
                "cleanup",
                "taskkill exited non-zero for backend '{}' (PID {}): status={:?} stderr={}",
                backend_name,
                pid,
                output.status.code(),
                String::from_utf8_lossy(&output.stderr)
            );
        }
        Err(e) => {
            log_error!(
                "cleanup",
                "Failed to invoke taskkill for backend '{}' (PID {}): {}",
                backend_name,
                pid,
                e
            );
        }
    }
}

// ==============================
// Register child process
// ==============================
fn register_child(state: &Arc<SidecarState>, name: &str, child: CommandChild) {
    let pid = child.pid();
    match state.children.lock() {
        Ok(mut map) => {
            map.insert(name.to_string(), child);
            log_info!(
                "sidecar",
                "Registered backend '{}' (PID {}) in sidecar state",
                name,
                pid
            );
        }
        Err(e) => {
            log_error!(
                "sidecar",
                "Failed to acquire sidecar state lock while registering backend '{}' (PID {}): {}",
                name,
                pid,
                e
            );
        }
    }
}

// ==============================
// Graceful Shutdown via HTTP (Fire and Forget)
// ==============================
fn fire_shutdown_request(backends: Vec<BackendConfig>) {
    log_info!(
        "shutdown",
        "Initiating graceful shutdown sequence for {} backend(s)...",
        backends.len()
    );

    std::thread::spawn(move || {
        let rt = match tokio::runtime::Runtime::new() {
            Ok(rt) => rt,
            Err(e) => {
                log_error!(
                    "shutdown",
                    "Failed to create tokio runtime for shutdown sequence: {}",
                    e
                );
                return;
            }
        };

        rt.block_on(async {
            let client = match Client::builder().timeout(Duration::from_secs(2)).build() {
                Ok(c) => c,
                Err(e) => {
                    log_error!(
                        "shutdown",
                        "Failed to build HTTP client for shutdown requests, falling back to default: {}",
                        e
                    );
                    Client::default()
                }
            };

            for config in backends {
                let Some(shutdown_url) = &config.shutdown_url else {
                    log_info!(
                        "shutdown",
                        "Backend '{}' has no shutdown URL configured, skipping",
                        config.name
                    );
                    continue;
                };

                log_info!(
                    "shutdown",
                    "Sending shutdown request to '{}' at {}",
                    config.name,
                    shutdown_url
                );

                match client.post(shutdown_url).send().await {
                    Ok(response) => {
                        log_info!(
                            "shutdown",
                            "Backend '{}' acknowledged shutdown request with status {}",
                            config.name,
                            response.status()
                        );
                    }
                    Err(e) => {
                        log_warn!(
                            "shutdown",
                            "Shutdown request to '{}' ({}) failed or timed out: {}. Force-kill fallback will handle cleanup on exit.",
                            config.name,
                            shutdown_url,
                            e
                        );
                    }
                }
            }

            log_info!("shutdown", "Graceful shutdown sequence completed");
        });
    });
}

// ==============================
// Kill ALL backends (force cleanup - fallback)
// ==============================
fn force_kill_all_backends(app_handle: &tauri::AppHandle) {
    log_info!("cleanup", "Force-kill fallback triggered for all backends");

    let Some(state) = app_handle.try_state::<Arc<SidecarState>>() else {
        log_warn!(
            "cleanup",
            "SidecarState not found on app handle, nothing to force-kill"
        );
        return;
    };

    let mut map = match state.children.lock() {
        Ok(map) => map,
        Err(e) => {
            log_error!(
                "cleanup",
                "Failed to acquire sidecar state lock during force-kill: {}",
                e
            );
            return;
        }
    };

    if map.is_empty() {
        log_info!("cleanup", "No tracked backend processes to kill");
        return;
    }

    for (name, child) in map.drain() {
        let pid = child.pid();
        log_info!("cleanup", "Killing backend '{}' (PID {})", name, pid);

        #[cfg(target_os = "windows")]
        {
            kill_process_tree_windows(&name, pid);
        }

        #[cfg(not(target_os = "windows"))]
        {
            match child.kill() {
                Ok(()) => {
                    log_info!(
                        "cleanup",
                        "Successfully killed backend '{}' (PID {})",
                        name,
                        pid
                    );
                }
                Err(e) => {
                    log_error!(
                        "cleanup",
                        "Failed to kill backend '{}' (PID {}): {}",
                        name,
                        pid,
                        e
                    );
                }
            }
        }
    }

    log_info!("cleanup", "Force-kill fallback completed");
}

// ==============================
// Health Check
// ==============================
async fn check_backend_health(backend_name: &str, url: &str, max_attempts: u32) -> bool {
    log_info!(
        "health",
        "Starting health check for '{}' at {} (max {} attempts)",
        backend_name,
        url,
        max_attempts
    );

    for attempt in 0..max_attempts {
        let attempt_num = attempt + 1;
        match reqwest::get(url).await {
            Ok(response) if response.status().is_success() => {
                log_info!(
                    "health",
                    "'{}' is healthy (attempt {}/{}, status {})",
                    backend_name,
                    attempt_num,
                    max_attempts,
                    response.status()
                );
                return true;
            }
            Ok(response) => {
                log_warn!(
                    "health",
                    "'{}' health check attempt {}/{} returned non-success status {}",
                    backend_name,
                    attempt_num,
                    max_attempts,
                    response.status()
                );
            }
            Err(e) => {
                log_warn!(
                    "health",
                    "'{}' health check attempt {}/{} failed: {}",
                    backend_name,
                    attempt_num,
                    max_attempts,
                    e
                );
            }
        }

        if attempt_num < max_attempts {
            sleep(Duration::from_secs(1)).await;
        }
    }

    log_error!(
        "health",
        "'{}' failed health check after {} attempts at {} (timeout)",
        backend_name,
        max_attempts,
        url
    );
    false
}

// ==============================
// Spawn Backend
// ==============================
async fn spawn_backend(
    app_handle: &tauri::AppHandle,
    state: Arc<SidecarState>,
    config: BackendConfig,
) -> Result<(), String> {
    let name = config.name.clone();
    log_info!(
        "sidecar",
        "Starting backend '{}' (executable: '{}', args: {:?})",
        name,
        config.exe,
        config.args
    );

    let sidecar_cmd = app_handle.shell().sidecar(&config.exe).map_err(|e| {
        let msg = format!(
            "Failed to resolve sidecar for backend '{}' (executable '{}'): {}",
            name, config.exe, e
        );
        log_error!("sidecar", "{}", msg);
        msg
    })?;

    log_info!(
        "sidecar",
        "Resolved sidecar executable for backend '{}'",
        name
    );

    let (mut rx, child) = sidecar_cmd.args(&config.args).spawn().map_err(|e| {
        let msg = format!(
            "Failed to spawn backend '{}' (executable '{}', args {:?}): {}",
            name, config.exe, config.args, e
        );
        log_error!("sidecar", "{}", msg);
        msg
    })?;

    let pid = child.pid();
    log_info!(
        "sidecar",
        "Backend '{}' spawned successfully with PID {}",
        name,
        pid
    );

    register_child(&state, &name, child);

    let name_clone = name.clone();
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) => {
                    let text = String::from_utf8_lossy(&line);
                    print!("[{}] {}", name_clone, text);
                }
                CommandEvent::Stderr(line) => {
                    let text = String::from_utf8_lossy(&line);
                    eprint!("[{}] [stderr] {}", name_clone, text);
                }
                CommandEvent::Terminated(payload) => {
                    log_warn!(
                        "sidecar",
                        "Backend '{}' terminated (code: {:?}, signal: {:?})",
                        name_clone,
                        payload.code,
                        payload.signal
                    );
                }
                CommandEvent::Error(err) => {
                    log_error!(
                        "sidecar",
                        "Backend '{}' reported a process error: {}",
                        name_clone,
                        err
                    );
                }
                other => {
                    log_info!(
                        "sidecar",
                        "Backend '{}' emitted unhandled event: {:?}",
                        name_clone,
                        other
                    );
                }
            }
        }
        log_info!(
            "sidecar",
            "Event stream for backend '{}' closed",
            name_clone
        );
    });

    log_info!("sidecar", "Backend '{}' startup routine completed", name);
    Ok(())
}

// ==============================
// Backend definitions
// ==============================
fn build_backend_configs() -> Vec<BackendConfig> {
    vec![
        BackendConfig {
            name: "TribeDB - Graph Database Engine".to_string(),
            exe: "tribe-database".to_string(),
            args: vec![],
            health_check_url: Some("http://localhost:50052/health".to_string()),
            shutdown_url: Some("http://localhost:50052/shutdown".to_string()),
        },
        BackendConfig {
            name: "TribeBench - Benchmark Engine Application".to_string(),
            exe: "benchmark-server".to_string(),
            args: vec![],
            health_check_url: Some("http://localhost:3001/health".to_string()),
            shutdown_url: Some("http://localhost:3001/shutdown".to_string()),
        },
        BackendConfig {
            name: "TribeServe - Backend Getway Server".to_string(),
            exe: "tribe-backend-server".to_string(),
            args: vec![],
            health_check_url: Some("http://localhost:8080/health".to_string()),
            shutdown_url: Some("http://localhost:8080/shutdown".to_string()),
        },
    ]
}

// ==============================
// Startup orchestration
// ==============================
async fn start_all_backends(app_handle: tauri::AppHandle, state: Arc<SidecarState>) {
    if cfg!(debug_assertions) {
        log_info!(
            "startup",
            "Dev mode detected: backends are assumed to be running externally"
        );
        return;
    }

    log_info!("startup", "Starting backends in production mode...");

    let backends = build_backend_configs();

    let backends_state = Arc::new(BackendsState {
        configs: backends.clone(),
    });
    app_handle.manage(backends_state);

    for config in &backends {
        if let Err(e) = spawn_backend(&app_handle, state.clone(), config.clone()).await {
            log_error!(
                "startup",
                "Backend '{}' failed to start: {}",
                config.name,
                e
            );
        }
    }

    let Some(backends_state) = app_handle.try_state::<Arc<BackendsState>>() else {
        log_error!(
            "startup",
            "BackendsState missing after registration, skipping health checks"
        );
        return;
    };

    for config in &backends_state.configs {
        let Some(url) = &config.health_check_url else {
            log_info!(
                "startup",
                "Backend '{}' has no health check URL configured, skipping",
                config.name
            );
            continue;
        };

        if check_backend_health(&config.name, url, 30).await {
            log_info!("startup", "Backend '{}' is ready", config.name);
        } else {
            log_error!(
                "startup",
                "Backend '{}' did not become healthy in time (url: {})",
                config.name,
                url
            );
        }
    }

    log_info!("startup", "All backends started successfully!");
}

// ==============================
// Window close handling
// ==============================
fn handle_window_close(window: &tauri::Window) {
    log_info!(
        "window",
        "Close requested for window '{}'",
        window.label()
    );

    let app_handle = window.app_handle().clone();

    match app_handle.try_state::<Arc<BackendsState>>() {
        Some(backends_state) => {
            let backends_clone = backends_state.configs.clone();
            fire_shutdown_request(backends_clone);
        }
        None => {
            log_warn!(
                "window",
                "BackendsState not available on close; skipping graceful HTTP shutdown (force-kill fallback will still run on exit)"
            );
        }
    }

    log_info!("window", "Proceeding with window close");
}

// ==============================
// Main
// ==============================
fn main() {
    log_info!("app", "Application starting");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            log_info!("app", "Running setup...");

            let sidecar_state = Arc::new(SidecarState {
                children: Mutex::new(HashMap::new()),
            });
            app.manage(sidecar_state.clone());
            log_info!("app", "Sidecar state initialized");

            let app_handle = app.handle().clone();

            tauri::async_runtime::spawn(async move {
                start_all_backends(app_handle, sidecar_state).await;
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                handle_window_close(window);
            }
        })
        .build(tauri::generate_context!())
        .expect("error building app")
        .run(|app_handle, event| {
            if let tauri::RunEvent::ExitRequested { .. } = event {
                log_info!("app", "Exit requested, running force-kill fallback");
                force_kill_all_backends(app_handle);
                log_info!("app", "Application exit complete");
            }
        });
}