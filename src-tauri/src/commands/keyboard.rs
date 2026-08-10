use std::fs;
use tauri::{AppHandle, Manager};

pub struct BundledLayout {
    pub id: &'static str,
    pub contents: &'static str,
}

// Embebidos en tiempo de compilación desde la fuente única de verdad en
// src/features/keyboard/layouts/ — mismo patrón que BUNDLED_THEMES en theme.rs.
// Los 19 layouts son la conversión 1:1 (solo nombres de campo, snake_case→camelCase)
// de los kb_layouts/*.json del eDEX-UI original; en-WORKMAN.json venía con un bug real
// en el origen (el JSON no cerraba el objeto de nivel superior) que se corrigió al
// convertirlo.
pub const BUNDLED_LAYOUTS: &[BundledLayout] = &[
    BundledLayout {
        id: "da-DK",
        contents: include_str!("../../../src/features/keyboard/layouts/da-DK.json"),
    },
    BundledLayout {
        id: "de-DE",
        contents: include_str!("../../../src/features/keyboard/layouts/de-DE.json"),
    },
    BundledLayout {
        id: "en-COLEMAK",
        contents: include_str!("../../../src/features/keyboard/layouts/en-COLEMAK.json"),
    },
    BundledLayout {
        id: "en-DVORAK",
        contents: include_str!("../../../src/features/keyboard/layouts/en-DVORAK.json"),
    },
    BundledLayout {
        id: "en-GB",
        contents: include_str!("../../../src/features/keyboard/layouts/en-GB.json"),
    },
    BundledLayout {
        id: "en-NORMAN",
        contents: include_str!("../../../src/features/keyboard/layouts/en-NORMAN.json"),
    },
    BundledLayout {
        id: "en-US",
        contents: include_str!("../../../src/features/keyboard/layouts/en-US.json"),
    },
    BundledLayout {
        id: "en-WORKMAN",
        contents: include_str!("../../../src/features/keyboard/layouts/en-WORKMAN.json"),
    },
    BundledLayout {
        id: "es-ES",
        contents: include_str!("../../../src/features/keyboard/layouts/es-ES.json"),
    },
    BundledLayout {
        id: "es-LAT",
        contents: include_str!("../../../src/features/keyboard/layouts/es-LAT.json"),
    },
    BundledLayout {
        id: "fr-BEPO",
        contents: include_str!("../../../src/features/keyboard/layouts/fr-BEPO.json"),
    },
    BundledLayout {
        id: "fr-FR",
        contents: include_str!("../../../src/features/keyboard/layouts/fr-FR.json"),
    },
    BundledLayout {
        id: "hu-HU",
        contents: include_str!("../../../src/features/keyboard/layouts/hu-HU.json"),
    },
    BundledLayout {
        id: "it-IT",
        contents: include_str!("../../../src/features/keyboard/layouts/it-IT.json"),
    },
    BundledLayout {
        id: "nl-BE",
        contents: include_str!("../../../src/features/keyboard/layouts/nl-BE.json"),
    },
    BundledLayout {
        id: "pt-BR",
        contents: include_str!("../../../src/features/keyboard/layouts/pt-BR.json"),
    },
    BundledLayout {
        id: "sv-SE",
        contents: include_str!("../../../src/features/keyboard/layouts/sv-SE.json"),
    },
    BundledLayout {
        id: "tr-TR-F",
        contents: include_str!("../../../src/features/keyboard/layouts/tr-TR-F.json"),
    },
    BundledLayout {
        id: "tr-TR-Q",
        contents: include_str!("../../../src/features/keyboard/layouts/tr-TR-Q.json"),
    },
];

fn layouts_dir(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(dir.join("keyboards"))
}

#[tauri::command]
pub fn keyboard_list(app: AppHandle) -> Result<Vec<String>, String> {
    let dir = layouts_dir(&app)?;
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
pub fn keyboard_read(app: AppHandle, id: String) -> Result<serde_json::Value, String> {
    let path = layouts_dir(&app)?.join(format!("{id}.json"));
    let raw = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&raw).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_bundled_layout_is_valid_json() {
        for layout in BUNDLED_LAYOUTS {
            serde_json::from_str::<serde_json::Value>(layout.contents)
                .unwrap_or_else(|e| panic!("{} no parsea como JSON: {e}", layout.id));
        }
    }

    #[test]
    fn bundled_layout_ids_have_no_duplicates() {
        let mut ids: Vec<&str> = BUNDLED_LAYOUTS.iter().map(|l| l.id).collect();
        let len_before = ids.len();
        ids.sort();
        ids.dedup();
        assert_eq!(ids.len(), len_before, "hay ids de layout duplicados");
    }

    // Regresión: el orden de las filas (row_numbers, row_1, row_2, row_3, row_space)
    // determina el orden visual en el teclado táctil (arriba→abajo) — sin la feature
    // "preserve_order" de serde_json, `serde_json::Value` reordena las claves de un
    // objeto alfabéticamente al serializar, así que `keyboard_read` (que pasa por
    // `serde_json::Value`) devolvía las filas en el orden
    // row_1/row_2/row_3/row_numbers/row_space en vez del orden real del archivo —
    // bug real, reportado por el usuario con captura de pantalla del teclado
    // desordenado en la app corriendo de verdad.
    #[test]
    fn keyboard_layout_json_preserves_row_order_through_serde_json_value() {
        let en_us = BUNDLED_LAYOUTS
            .iter()
            .find(|l| l.id == "en-US")
            .expect("en-US debería estar entre los layouts embebidos");
        let parsed: serde_json::Value =
            serde_json::from_str(en_us.contents).expect("en-US.json debería parsear");
        let keys: Vec<&String> = parsed
            .as_object()
            .expect("el layout debería ser un objeto JSON")
            .keys()
            .collect();
        assert_eq!(
            keys,
            vec!["row_numbers", "row_1", "row_2", "row_3", "row_space"],
            "las filas deben preservar el orden real del archivo, no orden alfabético"
        );
    }
}
