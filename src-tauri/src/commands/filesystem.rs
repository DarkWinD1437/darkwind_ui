use serde::Serialize;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;
use tauri::{AppHandle, Manager};

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FsEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub is_symlink: bool,
    pub hidden: bool,
    pub size: u64,
    pub modified_ms: Option<i64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FsListing {
    pub path: String,
    pub parent: Option<String>,
    pub entries: Vec<FsEntry>,
}

// El original (filesystem.class.js) solo marca como oculto un archivo que empieza con
// ".". En Windows eso deja afuera archivos/carpetas marcados como ocultos por el
// atributo real del sistema (ej. "desktop.ini", "$RECYCLE.BIN") que sí importan acá
// por ser un proyecto Windows-only — se suma ese chequeo además del prefijo, como
// mejora deliberada sobre el comportamiento original.
fn is_hidden(name: &str, path: &Path) -> bool {
    if name.starts_with('.') {
        return true;
    }
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        const FILE_ATTRIBUTE_HIDDEN: u32 = 0x2;
        if let Ok(meta) = path.symlink_metadata() {
            if meta.file_attributes() & FILE_ATTRIBUTE_HIDDEN != 0 {
                return true;
            }
        }
    }
    false
}

#[tauri::command]
pub fn fs_list_dir(path: String) -> Result<FsListing, String> {
    let dir = PathBuf::from(&path);
    let read_dir = std::fs::read_dir(&dir).map_err(|e| e.to_string())?;

    let mut entries = Vec::new();
    for item in read_dir {
        // Una entrada individual con error de permisos (EPERM/EBUSY) se ignora y se
        // sigue con el resto del listado — igual que el original (filesystem.class.js,
        // catch de lstat), en vez de que un solo archivo problemático tumbe el panel entero.
        let Ok(item) = item else { continue };
        let Ok(file_type) = item.file_type() else {
            continue;
        };
        let name = item.file_name().to_string_lossy().into_owned();
        let entry_path = item.path();
        let metadata = item.metadata().ok();
        let size = metadata.as_ref().map(|m| m.len()).unwrap_or(0);
        let modified_ms = metadata
            .as_ref()
            .and_then(|m| m.modified().ok())
            .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as i64);

        entries.push(FsEntry {
            hidden: is_hidden(&name, &entry_path),
            is_dir: file_type.is_dir(),
            is_symlink: file_type.is_symlink(),
            name,
            path: entry_path.to_string_lossy().into_owned(),
            size,
            modified_ms,
        });
    }

    // Carpetas primero, después archivos, alfabético case-insensitive dentro de cada
    // grupo — mismo criterio de sorting que filesystem.class.js del original.
    entries.sort_by(|a, b| {
        b.is_dir
            .cmp(&a.is_dir)
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });

    let parent = dir.parent().map(|p| p.to_string_lossy().into_owned());

    Ok(FsListing {
        path: dir.to_string_lossy().into_owned(),
        parent,
        entries,
    })
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DriveEntry {
    pub name: String,
    pub mount_point: String,
    pub is_removable: bool,
    pub total: u64,
    pub available: u64,
}

// Equivalente a la vista "Show disks" del original (readDevices(), vía
// window.si.blockDevices()) — acá con sysinfo::Disks, ya usado en sysinfo.rs.
#[tauri::command]
pub fn fs_list_drives() -> Vec<DriveEntry> {
    let disks = sysinfo::Disks::new_with_refreshed_list();
    disks
        .iter()
        .map(|d| {
            let label = d.name().to_string_lossy().into_owned();
            let mount = d.mount_point().to_string_lossy().into_owned();
            DriveEntry {
                name: if label.trim().is_empty() {
                    mount.clone()
                } else {
                    format!("{label} ({mount})")
                },
                mount_point: mount,
                is_removable: d.is_removable(),
                total: d.total_space(),
                available: d.available_space(),
            }
        })
        .collect()
}

#[tauri::command]
pub fn fs_home_dir(app: AppHandle) -> Result<String, String> {
    app.path()
        .home_dir()
        .map(|p| p.to_string_lossy().into_owned())
        .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::{create_dir, write};

    // Se prueba contra un directorio temporal real en vez de solo revisar el sorting
    // en memoria: la lógica de "hidden" y el manejo de errores de metadata dependen de
    // llamadas reales al sistema de archivos, que un test puramente sintético no ejercita.
    #[test]
    fn lists_and_sorts_dirs_before_files_case_insensitive() {
        let tmp = std::env::temp_dir().join(format!("darkwind_fs_test_{}", uuid::Uuid::new_v4()));
        create_dir(&tmp).expect("crear el directorio temporal debería funcionar");

        create_dir(tmp.join("Zebra_dir")).unwrap();
        create_dir(tmp.join("apple_dir")).unwrap();
        write(tmp.join("banana.txt"), b"").unwrap();
        write(tmp.join("Avocado.txt"), b"").unwrap();
        write(tmp.join(".hidden_file"), b"").unwrap();

        let listing = fs_list_dir(tmp.to_string_lossy().into_owned()).expect("debería listar");

        assert_eq!(listing.entries.len(), 5);
        let names: Vec<&str> = listing.entries.iter().map(|e| e.name.as_str()).collect();
        // Dentro de cada grupo (carpetas / archivos) el orden es alfabético
        // case-insensitive por nombre completo, incluido el "." inicial de los
        // dotfiles — "." (0x2E) ordena antes que las letras, así que ".hidden_file"
        // queda primero entre los archivos. Mismo criterio que localeCompare() en el
        // original (category primero, después nombre completo).
        assert_eq!(
            names,
            vec!["apple_dir", "Zebra_dir", ".hidden_file", "Avocado.txt", "banana.txt"]
        );

        let hidden = listing
            .entries
            .iter()
            .find(|e| e.name == ".hidden_file")
            .unwrap();
        assert!(hidden.hidden);
        assert!(!hidden.is_dir);

        let dir_entry = listing.entries.iter().find(|e| e.name == "apple_dir").unwrap();
        assert!(dir_entry.is_dir);

        std::fs::remove_dir_all(&tmp).ok();
    }

    #[test]
    fn nonexistent_path_returns_err_without_panicking() {
        let result = fs_list_dir("Z:\\this\\path\\does\\not\\exist\\at\\all".to_string());
        assert!(result.is_err());
    }

    #[test]
    fn list_drives_does_not_panic() {
        // No se puede asumir cuántas unidades tiene la máquina que corre el test —
        // solo se verifica que la llamada no entre en pánico y devuelva una lista válida.
        let _ = fs_list_drives();
    }
}
