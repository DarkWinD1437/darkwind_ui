// Evita una ventana de consola adicional en Windows para builds release, ¡NO QUITAR!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    darkwind_ui_lib::run()
}
