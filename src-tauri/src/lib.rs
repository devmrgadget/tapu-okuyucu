use std::process::Command;
use tauri::Manager;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[tauri::command]
async fn run_python(app_handle: tauri::AppHandle, script_path: String, payload: String) -> Result<String, String> {
    // In dev mode, Tauri runs from the src-tauri directory.
    // In production, scripts should be bundled as resources.
    let base_dir = if cfg!(debug_assertions) {
        // Development: current_dir is src-tauri/
        std::env::current_dir()
            .map_err(|e| format!("Failed to get current dir: {}", e))?
    } else {
        app_handle
            .path()
            .resource_dir()
            .map_err(|e| format!("Failed to get resource dir: {}", e))?
    };

    let script_full = base_dir.join(&script_path);
    let script_dir = script_full
        .parent()
        .map(|p| p.to_path_buf())
        .unwrap_or_else(|| base_dir.clone());

    let script_str = script_full.to_string_lossy().to_string();
    let payload_clone = payload.clone();

    // Offload the blocking process::Command to a background thread so we
    // never block the Tauri main / async-runtime thread.
    let result = tokio::task::spawn_blocking(move || {
        let mut cmd = Command::new("python");
        cmd.arg(&script_str)
            .arg(&payload_clone)
            .current_dir(&script_dir)
            .env("PYTHONUTF8", "1")
            .env("PYTHONIOENCODING", "utf-8");

        // Prevent a console window from flashing on Windows
        #[cfg(windows)]
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW

        let output = cmd.output()
            .map_err(|e| format!("Failed to execute python: {}", e))?;

        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();

        if !output.status.success() {
            return Err(format!("Python error (exit {}): {}", output.status, stderr));
        }

        let trimmed = stdout.trim().to_string();
        if trimmed.is_empty() {
            return Err(format!("Empty output from python. stderr: {}", stderr));
        }

        Ok(trimmed)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?;

    result
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![run_python])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
