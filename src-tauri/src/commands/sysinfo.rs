use crate::commands::geoip;
use crate::state::SysinfoState;
use serde::Serialize;
use std::collections::HashMap;
use std::net::{SocketAddr, TcpStream};
use std::time::{Duration, Instant};
use sysinfo::{Components, Disks, Networks, ProcessesToUpdate};
use tauri::{AppHandle, State};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CpuInfo {
    pub brand: String,
    pub global_usage: f32,
    pub per_core: Vec<f32>,
    pub frequency_mhz: u64,
    pub temperature_c: Option<f32>,
}

// La temperatura en Windows viene de WMI (MSAcpi_ThermalZoneTemperature) — sysinfo
// solo expone UN sensor genérico llamado "Computer" ahí (no hay desglose por núcleo
// como en Linux), y en muchos laptops ni eso está disponible. Se toma el primer
// componente con lectura, sin pretender que sea específicamente el die de la CPU —
// se trata como dato "best-effort", puede no estar disponible en todos los equipos.
fn read_cpu_temperature() -> Option<f32> {
    let components = Components::new_with_refreshed_list();
    components.list().iter().find_map(|c| c.temperature())
}

#[tauri::command]
pub fn sysinfo_cpu(state: State<SysinfoState>) -> CpuInfo {
    let mut system = state.0.lock().unwrap();
    system.refresh_cpu_usage();

    let brand = system
        .cpus()
        .first()
        .map(|c| c.brand().trim().to_string())
        .unwrap_or_default();

    let frequencies: Vec<u64> = system.cpus().iter().map(|c| c.frequency()).collect();
    let frequency_mhz = if frequencies.is_empty() {
        0
    } else {
        frequencies.iter().sum::<u64>() / frequencies.len() as u64
    };

    CpuInfo {
        brand,
        global_usage: system.global_cpu_usage(),
        per_core: system.cpus().iter().map(|c| c.cpu_usage()).collect(),
        frequency_mhz,
        temperature_c: read_cpu_temperature(),
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MemInfo {
    pub total: u64,
    pub used: u64,
    pub available: u64,
    pub total_swap: u64,
    pub used_swap: u64,
}

#[tauri::command]
pub fn sysinfo_mem(state: State<SysinfoState>) -> MemInfo {
    let mut system = state.0.lock().unwrap();
    system.refresh_memory();

    MemInfo {
        total: system.total_memory(),
        used: system.used_memory(),
        available: system.available_memory(),
        total_swap: system.total_swap(),
        used_swap: system.used_swap(),
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiskInfo {
    pub name: String,
    pub mount_point: String,
    pub file_system: String,
    pub total: u64,
    pub available: u64,
    pub is_removable: bool,
}

#[tauri::command]
pub fn sysinfo_disks() -> Vec<DiskInfo> {
    let disks = Disks::new_with_refreshed_list();
    disks
        .iter()
        .map(|d| DiskInfo {
            name: d.name().to_string_lossy().into_owned(),
            mount_point: d.mount_point().to_string_lossy().into_owned(),
            file_system: d.file_system().to_string_lossy().into_owned(),
            total: d.total_space(),
            available: d.available_space(),
            is_removable: d.is_removable(),
        })
        .collect()
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub cpu_usage: f32,
    pub memory: u64,
    pub exe: Option<String>,
    pub cmd: String,
}

#[tauri::command]
pub fn sysinfo_processes(state: State<SysinfoState>, limit: usize) -> Vec<ProcessInfo> {
    let mut system = state.0.lock().unwrap();
    system.refresh_processes(ProcessesToUpdate::All, true);

    let mut processes: Vec<ProcessInfo> = system
        .processes()
        .values()
        .map(|p| ProcessInfo {
            pid: p.pid().as_u32(),
            name: p.name().to_string_lossy().into_owned(),
            cpu_usage: p.cpu_usage(),
            memory: p.memory(),
            exe: p.exe().map(|path| path.to_string_lossy().into_owned()),
            cmd: p
                .cmd()
                .iter()
                .map(|arg| arg.to_string_lossy())
                .collect::<Vec<_>>()
                .join(" "),
        })
        .collect();

    processes.sort_by(|a, b| {
        b.cpu_usage
            .partial_cmp(&a.cpu_usage)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then_with(|| b.memory.cmp(&a.memory))
    });
    processes.truncate(limit);
    processes
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BatteryInfo {
    pub percentage: f32,
    pub state: String,
    pub time_to_empty_secs: Option<f32>,
    pub time_to_full_secs: Option<f32>,
}

// El original solo soportaba battery-level en macOS/Linux (osx-temperature-sensor,
// upower). starship-battery sí funciona en Windows vía la API nativa de energía —
// devolvemos None sin error en desktops sin batería, no es una falla real.
#[tauri::command]
pub fn sysinfo_battery() -> Option<BatteryInfo> {
    let manager = starship_battery::Manager::new().ok()?;
    let battery = manager.batteries().ok()?.next()?.ok()?;

    Some(BatteryInfo {
        percentage: battery.state_of_charge().value * 100.0,
        state: format!("{:?}", battery.state()),
        time_to_empty_secs: battery.time_to_empty().map(|t| t.value),
        time_to_full_secs: battery.time_to_full().map(|t| t.value),
    })
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NetIface {
    pub name: String,
    pub received: u64,
    pub transmitted: u64,
    pub total_received: u64,
    pub total_transmitted: u64,
    pub mac_address: String,
    pub ip_addresses: Vec<String>,
}

#[tauri::command]
pub fn sysinfo_network_ifaces() -> Vec<NetIface> {
    let networks = Networks::new_with_refreshed_list();
    networks
        .iter()
        .map(|(name, data)| NetIface {
            name: name.clone(),
            received: data.received(),
            transmitted: data.transmitted(),
            total_received: data.total_received(),
            total_transmitted: data.total_transmitted(),
            mac_address: data.mac_address().to_string(),
            ip_addresses: data.ip_networks().iter().map(|n| n.addr.to_string()).collect(),
        })
        .collect()
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NetConnection {
    pub protocol: String,
    pub local_addr: String,
    pub local_port: u16,
    pub remote_addr: String,
    pub remote_port: u16,
    pub state: String,
    pub pid: Option<u32>,
    pub process_name: Option<String>,
    pub remote_org: Option<String>,
}

#[tauri::command]
pub fn sysinfo_network_connections(
    app: AppHandle,
    state: State<SysinfoState>,
) -> Result<Vec<NetConnection>, String> {
    use netstat2::{
        get_sockets_info, AddressFamilyFlags, ProtocolFlags, ProtocolSocketInfo, TcpState,
    };

    let af_flags = AddressFamilyFlags::IPV4 | AddressFamilyFlags::IPV6;
    let proto_flags = ProtocolFlags::TCP;
    let sockets = get_sockets_info(af_flags, proto_flags).map_err(|e| e.to_string())?;

    // Nombre de proceso por pid: se resuelve una sola vez acá (no por conexión) para no
    // recorrer la tabla de procesos N veces.
    let mut system = state.0.lock().unwrap();
    system.refresh_processes(ProcessesToUpdate::All, true);
    let pid_to_name: HashMap<u32, String> = system
        .processes()
        .iter()
        .map(|(pid, p)| (pid.as_u32(), p.name().to_string_lossy().into_owned()))
        .collect();
    drop(system);

    // Organización ASN del remoto (ej. "Google LLC") — igual que geoip_lookup, best
    // effort: si no está la base ASN empaquetada, todo el mapeo queda vacío sin error.
    let asn_mmdb = geoip::resolve_asn_resource(&app);

    // get_sockets_info devuelve TODOS los sockets TCP, incluidos los que solo están
    // escuchando (LISTEN, remote_addr/remote_port en 0.0.0.0:0 porque todavía no hay
    // ningún peer del otro lado) — un servidor SQL/Docker/etc. local genera muchos de
    // estos. "Conexiones activas" en NetstatPanel se refiere a conexiones reales con un
    // peer remoto, así que solo se listan las que están en ESTABLISHED.
    Ok(sockets
        .into_iter()
        .filter_map(|si| match si.protocol_socket_info {
            ProtocolSocketInfo::Tcp(tcp) if tcp.state == TcpState::Established => {
                let pid = si.associated_pids.first().copied();
                let remote_addr = tcp.remote_addr.to_string();
                let remote_org = asn_mmdb
                    .as_deref()
                    .and_then(|path| geoip::lookup_asn_in_file(path, &remote_addr))
                    .map(|asn| asn.organization);

                Some(NetConnection {
                    protocol: "TCP".into(),
                    local_addr: tcp.local_addr.to_string(),
                    local_port: tcp.local_port,
                    remote_addr,
                    remote_port: tcp.remote_port,
                    state: format!("{:?}", tcp.state),
                    process_name: pid.and_then(|p| pid_to_name.get(&p).cloned()),
                    pid,
                    remote_org,
                })
            }
            _ => None,
        })
        .collect())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HostInfo {
    pub hostname: String,
    pub os_name: String,
    pub os_version: String,
    pub kernel_version: String,
    pub uptime_secs: u64,
    pub cores_physical: usize,
    pub cores_logical: usize,
    pub total_memory: u64,
}

#[tauri::command]
pub fn sysinfo_host(state: State<SysinfoState>) -> HostInfo {
    let system = state.0.lock().unwrap();

    HostInfo {
        hostname: sysinfo::System::host_name().unwrap_or_default(),
        os_name: sysinfo::System::name().unwrap_or_default(),
        os_version: sysinfo::System::os_version().unwrap_or_default(),
        kernel_version: sysinfo::System::kernel_version().unwrap_or_default(),
        uptime_secs: sysinfo::System::uptime(),
        cores_physical: sysinfo::System::physical_core_count().unwrap_or(0),
        cores_logical: system.cpus().len(),
        total_memory: system.total_memory(),
    }
}

// Réplica del "ping" TCP crudo del original (connect crudo por socket, no ICMP —
// evita requerir privilegios de raw-socket que un ping real necesitaría en Windows).
#[tauri::command]
pub fn sysinfo_tcp_ping(addr: String, port: u16) -> Result<u64, String> {
    let target: SocketAddr = format!("{addr}:{port}")
        .parse()
        .map_err(|_| "dirección inválida".to_string())?;
    let start = Instant::now();
    TcpStream::connect_timeout(&target, Duration::from_secs(3)).map_err(|e| e.to_string())?;
    Ok(start.elapsed().as_millis() as u64)
}

#[cfg(test)]
mod tests {
    use super::*;
    use sysinfo::System;

    // Igual que en pty.rs: los comandos de Tauri en sí son demasiado finos (lock +
    // mapear a un struct serde) como para valer la pena envolverlos en un `State`
    // falso — se ejercita directamente la mecánica de sysinfo/disks que envuelven,
    // contra hardware real, verificando que no entra en pánico.
    #[test]
    fn cpu_mem_refresh_dont_panic() {
        let mut system = System::new_all();
        system.refresh_cpu_usage();
        system.refresh_memory();
        let _ = system.global_cpu_usage();
        let _ = system.total_memory();
        let _: Vec<f32> = system.cpus().iter().map(|c| c.cpu_usage()).collect();
    }

    #[test]
    fn disks_and_host_dont_panic() {
        let disks = Disks::new_with_refreshed_list();
        let _: Vec<u64> = disks.iter().map(|d| d.total_space()).collect();
        let _ = System::host_name();
        let _ = System::uptime();
    }

    #[test]
    fn tcp_ping_closed_port_returns_err_without_panicking() {
        // No hay listener en el puerto 1 de loopback: el objetivo es que el comando
        // devuelva Err en vez de colgarse o entrar en pánico. El tiempo exacto de
        // rechazo (RST inmediato vs. timeout completo) depende del stack TCP del SO
        // y no es algo estable para afirmar en un test.
        let result = sysinfo_tcp_ping("127.0.0.1".into(), 1);
        assert!(result.is_err());
    }
}
