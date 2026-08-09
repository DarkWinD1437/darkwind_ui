mod commands;
mod state;

use commands::first_run::mirror_defaults_on_first_run;
use commands::pty::{pty_kill, pty_resize, pty_spawn, pty_status, pty_write};
use commands::settings::{settings_read, settings_write, shortcuts_read, shortcuts_write};
use commands::theme::{theme_list, theme_read};
use state::PtyState;

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
        // Sin esto, crates de terceros como portable-pty escriben logs en nivel TRACE
        // (volcando todas las variables de entorno del sistema, incluidas rutas
        // personales) al archivo de log persistente en cada sesión de terminal.
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .manage(PtyState::default())
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
            theme_read,
            pty_spawn,
            pty_write,
            pty_resize,
            pty_kill,
            pty_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
