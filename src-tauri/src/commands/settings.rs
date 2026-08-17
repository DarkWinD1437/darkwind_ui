use serde::{Deserialize, Serialize};
use std::fs;
use tauri::{AppHandle, Manager};

fn default_true() -> bool {
    true
}

fn default_shell() -> String {
    "powershell.exe".into()
}

fn default_keyboard() -> String {
    "en-US".into()
}

fn default_theme() -> String {
    "tron".into()
}

fn default_term_font_size() -> u32 {
    15
}

fn default_ui_scale() -> f32 {
    1.0
}

fn default_audio_volume() -> f32 {
    1.0
}

fn default_clock_hours() -> u8 {
    24
}

fn default_ping_addr() -> String {
    "1.1.1.1".into()
}

fn default_language() -> String {
    "auto".into()
}

// La terminal arrancaba sin cwd propio (string vacío) hasta esta ronda, así que
// heredaba el directorio de trabajo del propio proceso de la app — en la práctica,
// la carpeta donde vive el .exe, no un lugar útil para el usuario. C:\ es un punto de
// partida neutral y siempre existente en Windows; el usuario puede cambiarlo desde
// SettingsModal si prefiere otra carpeta.
fn default_cwd() -> String {
    "C:\\".into()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    #[serde(default = "default_shell")]
    pub shell: String,
    #[serde(default)]
    pub shell_args: String,
    #[serde(default = "default_cwd")]
    pub cwd: String,
    #[serde(default = "default_keyboard")]
    pub keyboard: String,
    #[serde(default = "default_theme")]
    pub theme: String,
    // "auto" = detectar desde el idioma del sistema operativo al arrancar (frontend,
    // vía @tauri-apps/plugin-os); cualquier otro valor ("en"/"es") es un override
    // manual explícito elegido en SettingsModal, que ya no se vuelve a autodetectar.
    #[serde(default = "default_language")]
    pub language: String,
    #[serde(default = "default_ui_scale")]
    pub ui_scale: f32,
    #[serde(default = "default_true")]
    pub virtual_keyboard: bool,
    #[serde(default = "default_term_font_size")]
    pub term_font_size: u32,
    #[serde(default = "default_true")]
    pub audio: bool,
    #[serde(default = "default_audio_volume")]
    pub audio_volume: f32,
    #[serde(default)]
    pub disable_feedback_audio: bool,
    #[serde(default = "default_clock_hours")]
    pub clock_hours: u8,
    #[serde(default = "default_ping_addr")]
    pub ping_addr: String,
    #[serde(default)]
    pub nointro: bool,
    #[serde(default = "default_true")]
    pub force_fullscreen: bool,
    #[serde(default)]
    pub hide_dotfiles: bool,
    #[serde(default)]
    pub fs_list_view: bool,
    #[serde(default)]
    pub experimental_globe_features: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Settings {
            shell: default_shell(),
            shell_args: String::new(),
            cwd: default_cwd(),
            keyboard: default_keyboard(),
            theme: default_theme(),
            language: default_language(),
            ui_scale: default_ui_scale(),
            virtual_keyboard: true,
            term_font_size: default_term_font_size(),
            audio: true,
            audio_volume: default_audio_volume(),
            disable_feedback_audio: false,
            clock_hours: default_clock_hours(),
            ping_addr: default_ping_addr(),
            nointro: false,
            force_fullscreen: true,
            hide_dotfiles: false,
            fs_list_view: false,
            experimental_globe_features: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Shortcut {
    #[serde(rename = "type")]
    pub kind: String,
    pub trigger: String,
    pub action: String,
    pub enabled: bool,
    #[serde(default)]
    pub linebreak: bool,
}

pub fn default_shortcuts() -> Vec<Shortcut> {
    let app = |trigger: &str, action: &str, enabled: bool| Shortcut {
        kind: "app".into(),
        trigger: trigger.into(),
        action: action.into(),
        enabled,
        linebreak: false,
    };

    vec![
        app("Ctrl+Shift+C", "COPY", true),
        app("Ctrl+Shift+V", "PASTE", true),
        app("Ctrl+Tab", "NEXT_TAB", true),
        app("Ctrl+Shift+Tab", "PREVIOUS_TAB", true),
        app("Ctrl+X", "TAB_X", true),
        app("Ctrl+Shift+S", "SETTINGS", true),
        app("Ctrl+Shift+K", "SHORTCUTS", true),
        app("Ctrl+Shift+Q", "QUIT", true),
        app("Ctrl+Shift+F", "FUZZY_SEARCH", true),
        app("Ctrl+Shift+L", "FS_LIST_VIEW", true),
        app("Ctrl+Shift+H", "FS_DOTFILES", true),
        app("Ctrl+Shift+P", "KB_PASSMODE", true),
        app("Ctrl+Shift+I", "DEV_DEBUG", false),
        app("Ctrl+Shift+F5", "DEV_RELOAD", true),
        Shortcut {
            kind: "shell".into(),
            trigger: "Ctrl+Shift+Alt+Space".into(),
            action: "neofetch".into(),
            enabled: false,
            linebreak: true,
        },
    ]
}

fn settings_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    Ok(dir.join("settings.json"))
}

fn shortcuts_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    Ok(dir.join("shortcuts.json"))
}

#[tauri::command]
pub fn settings_read(app: AppHandle) -> Result<Settings, String> {
    let path = settings_path(&app)?;
    let raw = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&raw).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn settings_write(app: AppHandle, settings: Settings) -> Result<(), String> {
    let path = settings_path(&app)?;
    let raw = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    fs::write(&path, raw).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn shortcuts_read(app: AppHandle) -> Result<Vec<Shortcut>, String> {
    let path = shortcuts_path(&app)?;
    let raw = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&raw).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn shortcuts_write(app: AppHandle, shortcuts: Vec<Shortcut>) -> Result<(), String> {
    let path = shortcuts_path(&app)?;
    let raw = serde_json::to_string_pretty(&shortcuts).map_err(|e| e.to_string())?;
    fs::write(&path, raw).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    // Un settings.json escrito por una instalación de antes de la Fase 5 no tiene el
    // campo "language" — sin el #[serde(default = "default_language")] esto rompería
    // la deserialización en el primer arranque post-actualización en vez de migrar
    // silenciosamente, igual que ya pasa con cada campo agregado en fases anteriores.
    #[test]
    fn settings_without_language_field_defaults_to_auto() {
        let old_json = r#"{
            "shell": "powershell.exe", "shellArgs": "", "cwd": "", "keyboard": "en-US",
            "theme": "tron", "termFontSize": 15, "audio": true, "audioVolume": 1.0,
            "disableFeedbackAudio": false, "clockHours": 24, "pingAddr": "1.1.1.1",
            "port": 3000, "nointro": false, "nocursor": false, "forceFullscreen": true,
            "allowWindowed": false, "excludeThreadsFromToplist": true,
            "hideDotfiles": false, "fsListView": false,
            "experimentalGlobeFeatures": false, "experimentalFeatures": false
        }"#;
        let settings: Settings = serde_json::from_str(old_json).expect("debe deserializar");
        assert_eq!(settings.language, "auto");
        assert_eq!(settings.ui_scale, 1.0);
        assert!(settings.virtual_keyboard);
    }

    // La terminal arrancaba en la carpeta del propio proceso de la app cuando cwd
    // venía vacío ("" es un valor válido de String, no dispara el default de serde) —
    // Settings::default() ahora debe traer un valor útil de fábrica.
    #[test]
    fn default_settings_cwd_points_to_c_drive() {
        assert_eq!(Settings::default().cwd, "C:\\");
    }

    #[test]
    fn default_shortcuts_has_settings_and_shortcuts_actions() {
        let shortcuts = default_shortcuts();
        assert!(shortcuts.iter().any(|s| s.action == "SETTINGS" && s.trigger == "Ctrl+Shift+S"));
        assert!(shortcuts.iter().any(|s| s.action == "SHORTCUTS" && s.trigger == "Ctrl+Shift+K"));
    }

    // En pantalla completa forzada no hay barra de título ni botón "X" nativo del SO
    // para cerrar — sin un atajo/botón propio, la única forma de salir quedaba en
    // Alt+F4 (funciona igual a nivel de SO, pero no es descubrible para el usuario).
    #[test]
    fn default_shortcuts_has_quit_action() {
        let shortcuts = default_shortcuts();
        assert!(shortcuts.iter().any(|s| s.action == "QUIT" && s.trigger == "Ctrl+Shift+Q"));
    }
}
