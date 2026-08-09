use super::settings::{default_shortcuts, Settings};
use super::theme::BUNDLED_THEMES;
use std::fs;
use tauri::{AppHandle, Manager};

// Mirrors src/_boot.js from the legacy eDEX-UI project: settings.json/shortcuts.json are
// only written if missing (so user edits survive), while bundled themes are re-written on
// every launch so they stay in sync with the app version — matching the original's actual
// behavior (not gated by an existsSync check there either).
pub fn mirror_defaults_on_first_run(app: &AppHandle) -> Result<(), String> {
    let config_dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&config_dir).map_err(|e| e.to_string())?;

    let settings_path = config_dir.join("settings.json");
    if !settings_path.exists() {
        let mut settings = Settings::default();
        settings.cwd = config_dir.to_string_lossy().into_owned();
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

    Ok(())
}
