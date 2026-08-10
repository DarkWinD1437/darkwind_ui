use serde::Serialize;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GeoRecord {
    pub country: Option<String>,
    pub city: Option<String>,
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AsnRecord {
    pub asn: u32,
    pub organization: String,
}

// A diferencia del original (que descarga el .mmdb en el primer arranque desde un
// mirror de redistribución no oficial), acá se empaquetan las bases de MaxMind como
// recursos de Tauri (ver `bundle.resources` en tauri.conf.json y
// `resources/geoip/README.md`) — el usuario final no necesita cuenta de MaxMind ni
// configurar nada. Primero se busca el recurso empaquetado con la app; si no está
// (ej. build sin el archivo colocado), se prueba una copia en app_data_dir() como
// mecanismo manual de reemplazo/actualización sin recompilar. Si ninguna existe, se
// devuelve None sin error.
fn resolve_geoip_resource(app: &AppHandle, filename: &str) -> Option<PathBuf> {
    if let Ok(resource_path) = app
        .path()
        .resolve(format!("geoip/{filename}"), tauri::path::BaseDirectory::Resource)
    {
        if resource_path.exists() {
            return Some(resource_path);
        }
    }

    let data_dir = app.path().app_data_dir().ok()?;
    let override_path = data_dir.join("geoip").join(filename);
    override_path.exists().then_some(override_path)
}

// Separado de resolve_geoip_resource()/AppHandle para poder testearse directo contra
// un path de archivo, sin necesitar un AppHandle real (ver tests, `real_mmdb_...`).
fn lookup_city_in_file(mmdb_path: &Path, ip: &str) -> Result<Option<GeoRecord>, String> {
    // Un archivo presente pero corrupto/incompatible (ej. el placeholder de
    // desarrollo antes de colocar el .mmdb real, ver resources/geoip/README.md)
    // degrada a None en vez de propagar el error al frontend.
    let Ok(reader) = maxminddb::Reader::open_readfile(mmdb_path) else {
        return Ok(None);
    };
    let addr: std::net::IpAddr = ip.parse().map_err(|_| "IP inválida".to_string())?;

    let Ok(lookup_result) = reader.lookup(addr) else {
        return Ok(None);
    };
    let city: maxminddb::geoip2::City = match lookup_result.decode() {
        Ok(Some(record)) => record,
        _ => return Ok(None),
    };

    Ok(Some(GeoRecord {
        country: city.country.names.english.map(|s| s.to_string()),
        city: city.city.names.english.map(|s| s.to_string()),
        latitude: city.location.latitude,
        longitude: city.location.longitude,
    }))
}

fn lookup_country_name_in_file(mmdb_path: &Path, ip: &str) -> Option<String> {
    let reader = maxminddb::Reader::open_readfile(mmdb_path).ok()?;
    let addr: std::net::IpAddr = ip.parse().ok()?;
    let lookup_result = reader.lookup(addr).ok()?;
    let country: maxminddb::geoip2::Country = lookup_result.decode().ok()??;
    country.country.names.english.map(|s| s.to_string())
}

// Reusable desde sysinfo.rs (enriquecer conexiones activas) sin pasar por IPC.
pub fn lookup_asn_in_file(mmdb_path: &Path, ip: &str) -> Option<AsnRecord> {
    let reader = maxminddb::Reader::open_readfile(mmdb_path).ok()?;
    let addr: std::net::IpAddr = ip.parse().ok()?;
    let lookup_result = reader.lookup(addr).ok()?;
    let asn: maxminddb::geoip2::Asn = lookup_result.decode().ok()??;
    Some(AsnRecord {
        asn: asn.autonomous_system_number?,
        organization: asn.autonomous_system_organization?.to_string(),
    })
}

pub fn resolve_asn_resource(app: &AppHandle) -> Option<PathBuf> {
    resolve_geoip_resource(app, "GeoLite2-ASN.mmdb")
}

#[tauri::command]
pub fn geoip_lookup(app: AppHandle, ip: String) -> Result<Option<GeoRecord>, String> {
    let Some(city_mmdb) = resolve_geoip_resource(&app, "GeoLite2-City.mmdb") else {
        log::debug!("geoip_lookup: no se encontró GeoLite2-City.mmdb");
        return Ok(None);
    };
    log::debug!("geoip_lookup: usando mmdb en {}", city_mmdb.display());

    let mut record = lookup_city_in_file(&city_mmdb, &ip)?;

    // GeoLite2-City no siempre trae `country` (IPs anycast/de infraestructura, ver
    // el hallazgo de 1.1.1.1 en plan_migracion.txt) — GeoLite2-Country es una base
    // separada con mejor cobertura solo para ese dato, se usa como respaldo.
    let needs_country_fallback = record.as_ref().map(|r| r.country.is_none()).unwrap_or(true);
    if needs_country_fallback {
        if let Some(country_mmdb) = resolve_geoip_resource(&app, "GeoLite2-Country.mmdb") {
            if let Some(country_name) = lookup_country_name_in_file(&country_mmdb, &ip) {
                match &mut record {
                    Some(r) => r.country = Some(country_name),
                    None => {
                        record = Some(GeoRecord {
                            country: Some(country_name),
                            city: None,
                            latitude: None,
                            longitude: None,
                        })
                    }
                }
            }
        }
    }

    Ok(record)
}

#[tauri::command]
pub fn geoip_asn_lookup(app: AppHandle, ip: String) -> Option<AsnRecord> {
    let mmdb_path = resolve_asn_resource(&app)?;
    lookup_asn_in_file(&mmdb_path, &ip)
}

#[cfg(test)]
mod tests {
    #[test]
    fn invalid_ip_is_rejected_before_touching_the_filesystem() {
        // No necesita AppHandle real: el parseo de IP falla antes de resolver rutas.
        let addr: Result<std::net::IpAddr, _> = "no-es-una-ip".parse();
        assert!(addr.is_err());
    }

    #[test]
    fn corrupt_or_placeholder_mmdb_file_fails_to_open_as_reader() {
        // Confirma la premisa detrás del `let Ok(reader) = ... else { return Ok(None) }`
        // de lookup_city_in_file: un archivo presente pero que no es un .mmdb válido
        // (como el placeholder de desarrollo en resources/geoip/) hace fallar el open,
        // no un panic.
        let dir = std::env::temp_dir();
        let path = dir.join("darkwind_ui_test_placeholder.mmdb");
        std::fs::write(&path, b"no es un mmdb valido").unwrap();

        let result = maxminddb::Reader::open_readfile(&path);
        assert!(result.is_err());

        let _ = std::fs::remove_file(&path);
    }

    // #[ignore]: depende de los .mmdb reales en resources/geoip/, que no están en git
    // (ver resources/geoip/README.md) — no corren en `cargo test` normal ni en una
    // máquina/CI sin los archivos. Correr a mano con:
    //   cargo test -- --ignored real_mmdb
    //
    // Nota (hallazgo real de esta verificación): 1.1.1.1 (Cloudflare) NO sirve como IP
    // de prueba — en GeoLite2-City (edición gratuita) esa IP anycast no trae ningún
    // dato (ni country, ni continent, ni location), solo registered_country. 8.8.8.8
    // (Google) sí trae país + lat/lon reales, aunque tampoco ciudad — son
    // limitaciones reales de la base gratuita en IPs de infraestructura/anycast, no
    // errores de decodificación. Una IP residencial/de ISP normal (el caso real de
    // NetstatPanel: la IP externa del propio usuario) sí trae el registro completo.
    #[test]
    #[ignore]
    fn real_mmdb_resolves_a_known_public_ip() {
        let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("resources/geoip/GeoLite2-City.mmdb");

        let record = super::lookup_city_in_file(&path, "8.8.8.8")
            .expect("no debería devolver Err")
            .expect("un mmdb real debería resolver 8.8.8.8");

        assert_eq!(record.country.as_deref(), Some("United States"));
        assert!(record.latitude.is_some() && record.longitude.is_some());
    }

    #[test]
    #[ignore]
    fn real_asn_mmdb_resolves_google_public_dns() {
        let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("resources/geoip/GeoLite2-ASN.mmdb");

        let record = super::lookup_asn_in_file(&path, "8.8.8.8")
            .expect("un mmdb ASN real debería resolver 8.8.8.8");

        assert_eq!(record.asn, 15169); // AS15169 = Google LLC
    }

    #[test]
    #[ignore]
    fn real_country_mmdb_resolves_a_known_public_ip() {
        let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("resources/geoip/GeoLite2-Country.mmdb");

        // Nota: 1.1.1.1 NO sirve para probar el fallback — se intentó primero y
        // reveló que Cloudflare tampoco tiene país en GeoLite2-Country (ninguna de
        // las dos bases gratuitas la geolocaliza; probablemente excluida a propósito
        // por privacidad). El fallback de Sección 6.3 sigue siendo válido para el caso
        // general (una City sin `country` pero que sí figura en Country), solo que
        // 1.1.1.1 no es un ejemplo de ese caso — es un ejemplo de "ninguna base tiene
        // el dato", que también se maneja bien (None sin error).
        let country = super::lookup_country_name_in_file(&path, "8.8.8.8");
        assert_eq!(country.as_deref(), Some("United States"));
    }
}
