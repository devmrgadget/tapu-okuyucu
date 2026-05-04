use tauri_plugin_shell::ShellExt;
use tauri::Manager;

#[tauri::command]
async fn run_python(app_handle: tauri::AppHandle, payload: String) -> Result<String, String> {
    
    // Uygulamanın AppData klasörünü bul (Veritabanı vb. için gerekiyorsa)
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("App data dir bulunamadı: {}", e))?;
        
    let app_data_str = app_data_dir.to_string_lossy().to_string();

    // JSON payload içine app_data_dir enjekte etme (önceki kodundaki mantık)
    let final_payload = match serde_json::from_str::<serde_json::Value>(&payload) {
        Ok(mut json_val) => {
            if let Some(obj) = json_val.as_object_mut() {
                obj.insert("app_data_dir".to_string(), serde_json::Value::String(app_data_str));
            }
            serde_json::to_string(&json_val).unwrap_or(payload.clone())
        }
        Err(_) => payload.clone(),
    };

    // Tauri Shell eklentisi ile sidecar'ı çağır
    // "api" ismi tauri.conf.json dosyasındaki externalBin listesinde yazdığımız isimdir.
    let sidecar_command = app_handle.shell().sidecar("main")
        .map_err(|e| format!("Sidecar başlatılamadı: {}", e))?;

    // Argümanı verip asenkron olarak çalıştır ve sonucu bekle
    let output = sidecar_command
        .arg(&final_payload)
        .output()
        .await
        .map_err(|e| format!("Python sidecar çalıştırılırken hata oluştu: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();

    if output.status.success() {
        if stdout.is_empty() {
            return Err(format!("Python boş yanıt döndürdü. Stderr: {}", stderr));
        }
        Ok(stdout)
    } else {
        Err(format!("Python Hatası (Exit {}): {}", output.status.code().unwrap_or(-1), stderr))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_log::Builder::new().build())
        .invoke_handler(tauri::generate_handler![run_python])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}