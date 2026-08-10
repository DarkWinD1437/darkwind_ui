use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GpuStats {
    pub vendor: String,
    pub model: String,
    pub total_vram: u64,
    pub used_vram: u64,
    pub load_pct: u32,
    pub temperature_c: f32,
}

// eDEX-UI nunca tuvo estadísticas de GPU (solo CPU/RAM) — capacidad nueva, con soporte
// multi-fabricante real (NVIDIA/AMD/Intel) vía gfxinfo en vez de nvml-wrapper
// (NVIDIA-only). Sin GPU reconocida o sin driver compatible se devuelve None en vez de
// error, mismo criterio "best-effort" que ya se usa para la temperatura de CPU
// (sysinfo.rs).
#[tauri::command]
pub fn sysinfo_gpu() -> Option<GpuStats> {
    let gpu = gfxinfo::active_gpu().ok()?;
    let info = gpu.info();

    Some(GpuStats {
        vendor: gpu.vendor().to_string(),
        model: gpu.model().to_string(),
        total_vram: info.total_vram(),
        used_vram: info.used_vram(),
        load_pct: info.load_pct(),
        // gfxinfo devuelve la temperatura en milicelsius.
        temperature_c: info.temperature() as f32 / 1000.0,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sysinfo_gpu_does_not_panic_without_a_discrete_gpu() {
        let _ = sysinfo_gpu();
    }
}
