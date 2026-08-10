import { invoke } from "@tauri-apps/api/core";

export interface CpuInfo {
  brand: string;
  globalUsage: number;
  perCore: number[];
  frequencyMhz: number;
  temperatureC: number | null;
}

export interface MemInfo {
  total: number;
  used: number;
  available: number;
  totalSwap: number;
  usedSwap: number;
}

export interface DiskInfo {
  name: string;
  mountPoint: string;
  fileSystem: string;
  total: number;
  available: number;
  isRemovable: boolean;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  cpuUsage: number;
  memory: number;
  exe: string | null;
  cmd: string;
}

export interface BatteryInfo {
  percentage: number;
  state: string;
  timeToEmptySecs: number | null;
  timeToFullSecs: number | null;
}

export interface NetIface {
  name: string;
  received: number;
  transmitted: number;
  totalReceived: number;
  totalTransmitted: number;
  macAddress: string;
  ipAddresses: string[];
}

export interface NetConnection {
  protocol: string;
  localAddr: string;
  localPort: number;
  remoteAddr: string;
  remotePort: number;
  state: string;
  pid: number | null;
  processName: string | null;
  remoteOrg: string | null;
}

export interface HostInfo {
  hostname: string;
  osName: string;
  osVersion: string;
  kernelVersion: string;
  uptimeSecs: number;
  coresPhysical: number;
  coresLogical: number;
  totalMemory: number;
}

export interface GeoRecord {
  country: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface AsnRecord {
  asn: number;
  organization: string;
}

export interface GpuStats {
  vendor: string;
  model: string;
  totalVram: number;
  usedVram: number;
  loadPct: number;
  temperatureC: number;
}

export function fetchCpu(): Promise<CpuInfo> {
  return invoke("sysinfo_cpu");
}

export function fetchMem(): Promise<MemInfo> {
  return invoke("sysinfo_mem");
}

export function fetchDisks(): Promise<DiskInfo[]> {
  return invoke("sysinfo_disks");
}

export function fetchProcesses(limit: number): Promise<ProcessInfo[]> {
  return invoke("sysinfo_processes", { limit });
}

export function fetchBattery(): Promise<BatteryInfo | null> {
  return invoke("sysinfo_battery");
}

export function fetchNetworkIfaces(): Promise<NetIface[]> {
  return invoke("sysinfo_network_ifaces");
}

export function fetchNetworkConnections(): Promise<NetConnection[]> {
  return invoke("sysinfo_network_connections");
}

export function fetchHost(): Promise<HostInfo> {
  return invoke("sysinfo_host");
}

export function tcpPing(addr: string, port: number): Promise<number> {
  return invoke("sysinfo_tcp_ping", { addr, port });
}

export function geoipLookup(ip: string): Promise<GeoRecord | null> {
  return invoke("geoip_lookup", { ip });
}

export function fetchGpu(): Promise<GpuStats | null> {
  return invoke("sysinfo_gpu");
}

export function geoipAsnLookup(ip: string): Promise<AsnRecord | null> {
  return invoke("geoip_asn_lookup", { ip });
}
