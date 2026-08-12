mod commands;
mod state;

use commands::filesystem::{fs_home_dir, fs_list_dir, fs_list_drives};
use commands::first_run::mirror_defaults_on_first_run;
use commands::geoip::{geoip_asn_lookup, geoip_lookup};
use commands::gpu::sysinfo_gpu;
use commands::keyboard::{keyboard_list, keyboard_read};
use commands::pty::{pty_kill, pty_resize, pty_spawn, pty_status, pty_write};
use commands::settings::{settings_read, settings_write, shortcuts_read, shortcuts_write};
use commands::sysinfo::{
    sysinfo_battery, sysinfo_cpu, sysinfo_disks, sysinfo_host, sysinfo_mem,
    sysinfo_network_connections, sysinfo_network_ifaces, sysinfo_processes, sysinfo_tcp_ping,
};
use commands::theme::{theme_list, theme_read};
use state::{PtyState, SysinfoState};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    std::panic::set_hook(Box::new(|info| {
        log::error!("panic: {info}");
    }));

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        // Sin esto, crates de terceros como portable-pty escriben logs en nivel TRACE
        // (volcando todas las variables de entorno del sistema, incluidas rutas
        // personales) al archivo de log persistente en cada sesión de terminal.
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .manage(PtyState::default())
        .manage(SysinfoState::default())
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
            pty_status,
            sysinfo_cpu,
            sysinfo_mem,
            sysinfo_disks,
            sysinfo_processes,
            sysinfo_battery,
            sysinfo_network_ifaces,
            sysinfo_network_connections,
            sysinfo_host,
            sysinfo_tcp_ping,
            sysinfo_gpu,
            geoip_lookup,
            geoip_asn_lookup,
            keyboard_list,
            keyboard_read,
            fs_list_dir,
            fs_list_drives,
            fs_home_dir
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
