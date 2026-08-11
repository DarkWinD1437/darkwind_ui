use super::keyboard::BUNDLED_LAYOUTS;
use super::settings::{default_shortcuts, Settings};
use super::theme::BUNDLED_THEMES;
use std::fs;
use tauri::{AppHandle, Manager};

// Replica el comportamiento de src/_boot.js del proyecto original: settings.json/
// shortcuts.json solo se escriben si faltan (para que las ediciones del usuario
// sobrevivan), mientras que los temas empaquetados se re-escriben en cada arranque
// para mantenerse sincronizados con la versión de la app — igual al comportamiento
// real del original (que tampoco los protege con un chequeo de existencia).
pub fn mirror_defaults_on_first_run(app: &AppHandle) -> Result<(), String> {
    let config_dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&config_dir).map_err(|e| e.to_string())?;

    let settings_path = config_dir.join("settings.json");
    if !settings_path.exists() {
        // Antes se pisaba acá con `config_dir` (la carpeta de settings.json/temas/etc.)
        // — la terminal terminaba arrancando en una carpeta de configuración interna
        // de la app en vez de un lugar útil. `Settings::default()` ya trae `cwd`
        // apuntando a C:\ (Sección settings.rs::default_cwd), sin necesidad de
        // pisarlo acá.
        let settings = Settings::default();
        let raw = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
        fs::write(&settings_path, raw).map_err(|e| e.to_string())?;
    }

    let shortcuts_path = config_dir.join("shortcuts.json");
    if !shortcuts_path.exists() {
        let raw = serde_json::to_string_pretty(&default_shortcuts()).map_err(|e| e.to_string())?;
        fs::write(&shortcuts_path, raw).map_err(|e| e.to_string())?;
    }

    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let themes_dir = data_dir.join("themes");
    fs::create_dir_all(&themes_dir).map_err(|e| e.to_string())?;
    for theme in BUNDLED_THEMES {
        let path = themes_dir.join(format!("{}.json", theme.id));
        fs::write(&path, theme.contents).map_err(|e| e.to_string())?;
    }

    let keyboards_dir = data_dir.join("keyboards");
    fs::create_dir_all(&keyboards_dir).map_err(|e| e.to_string())?;
    for layout in BUNDLED_LAYOUTS {
        let path = keyboards_dir.join(format!("{}.json", layout.id));
        fs::write(&path, layout.contents).map_err(|e| e.to_string())?;
    }

    Ok(())
}
