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

fn default_audio_volume() -> f32 {
    1.0
}

fn default_clock_hours() -> u8 {
    24
}

fn default_ping_addr() -> String {
    "1.1.1.1".into()
}

fn default_port() -> u16 {
    3000
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    #[serde(default = "default_shell")]
    pub shell: String,
    #[serde(default)]
    pub shell_args: String,
    #[serde(default)]
    pub cwd: String,
    #[serde(default = "default_keyboard")]
    pub keyboard: String,
    #[serde(default = "default_theme")]
    pub theme: String,
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
    #[serde(default = "default_port")]
    pub port: u16,
    #[serde(default)]
    pub nointro: bool,
    #[serde(default)]
    pub nocursor: bool,
    #[serde(default = "default_true")]
    pub force_fullscreen: bool,
    #[serde(default)]
    pub allow_windowed: bool,
    #[serde(default = "default_true")]
    pub exclude_threads_from_toplist: bool,
    #[serde(default)]
    pub hide_dotfiles: bool,
    #[serde(default)]
    pub fs_list_view: bool,
    #[serde(default)]
    pub experimental_globe_features: bool,
    #[serde(default)]
    pub experimental_features: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Settings {
            shell: default_shell(),
            shell_args: String::new(),
            cwd: String::new(),
            keyboard: default_keyboard(),
            theme: default_theme(),
            term_font_size: default_term_font_size(),
            audio: true,
            audio_volume: default_audio_volume(),
            disable_feedback_audio: false,
            clock_hours: default_clock_hours(),
            ping_addr: default_ping_addr(),
            port: default_port(),
            nointro: false,
            nocursor: false,
            force_fullscreen: true,
            allow_windowed: false,
            exclude_threads_from_toplist: true,
            hide_dotfiles: false,
            fs_list_view: false,
            experimental_globe_features: false,
            experimental_features: false,
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
