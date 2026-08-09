use std::fs;
use tauri::{AppHandle, Manager};

pub struct BundledTheme {
    pub id: &'static str,
    pub contents: &'static str,
}

// Embedded at compile time from the single source of truth in src/core/theme/builtin/.
// Only base palettes are bundled — the legacy "-notype"/"-disrupted"/"-colorfilter" theme
// variants relied on arbitrary injectCSS hacks, which this schema removes entirely, so
// they have no equivalent to port.
pub const BUNDLED_THEMES: &[BundledTheme] = &[
    BundledTheme {
        id: "apollo",
        contents: include_str!("../../../src/core/theme/builtin/apollo.json"),
    },
    BundledTheme {
        id: "blade",
        contents: include_str!("../../../src/core/theme/builtin/blade.json"),
    },
    BundledTheme {
        id: "chalkboard",
        contents: include_str!("../../../src/core/theme/builtin/chalkboard.json"),
    },
    BundledTheme {
        id: "cyborg",
        contents: include_str!("../../../src/core/theme/builtin/cyborg.json"),
    },
    BundledTheme {
        id: "interstellar",
        contents: include_str!("../../../src/core/theme/builtin/interstellar.json"),
    },
    BundledTheme {
        id: "navy",
        contents: include_str!("../../../src/core/theme/builtin/navy.json"),
    },
    BundledTheme {
        id: "nord",
        contents: include_str!("../../../src/core/theme/builtin/nord.json"),
    },
    BundledTheme {
        id: "red",
        contents: include_str!("../../../src/core/theme/builtin/red.json"),
    },
    BundledTheme {
        id: "tron",
        contents: include_str!("../../../src/core/theme/builtin/tron.json"),
    },
];

fn themes_dir(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(dir.join("themes"))
}

#[tauri::command]
pub fn theme_list(app: AppHandle) -> Result<Vec<String>, String> {
    let dir = themes_dir(&app)?;
    let mut ids = Vec::new();
    for entry in fs::read_dir(&dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) == Some("json") {
            if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                ids.push(stem.to_string());
            }
        }
    }
    ids.sort();
    Ok(ids)
}

#[tauri::command]
pub fn theme_read(app: AppHandle, id: String) -> Result<serde_json::Value, String> {
    let path = themes_dir(&app)?.join(format!("{id}.json"));
    let raw = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&raw).map_err(|e| e.to_string())
}
