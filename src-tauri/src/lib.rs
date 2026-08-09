mod commands;

use commands::first_run::mirror_defaults_on_first_run;
use commands::settings::{settings_read, settings_write, shortcuts_read, shortcuts_write};
use commands::theme::{theme_list, theme_read};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    std::panic::set_hook(Box::new(|info| {
        log::error!("panic: {info}");
    }));

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_log::Builder::new().build())
        .setup(|app| {
            mirror_defaults_on_first_run(app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            settings_read,
            settings_write,
            shortcuts_read,
            shortcuts_write,
            theme_list,
            theme_read
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
