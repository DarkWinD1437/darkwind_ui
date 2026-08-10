import { defineStore } from "pinia";
import { fetchExternalIp } from "../externalIp";
import * as client from "../sysinfoClient";

const HISTORY_LENGTH = 60;
const FAST_POLL_MS = 1500;
const SLOW_POLL_MS = 5000;

interface NetSample {
  rx: number;
  tx: number;
}

export const useSysinfoStore = defineStore("sysinfo", {
  state: () => ({
    cpu: null as client.CpuInfo | null,
    cpuHistory: [] as number[],
    // Un historial por núcleo (no solo el agregado de cpuHistory) para el gráfico por
    // núcleo del modal expandido de CpuinfoPanel — la grilla de barras compacta ya
    // muestra el valor actual, pero no la tendencia de cada núcleo por separado.
    cpuPerCoreHistory: [] as number[][],
    gpu: null as client.GpuStats | null,
    gpuHistory: [] as number[],
    // Historial separado de temperatura (no solo de carga) para el modal expandido de
    // GpuPanel — misma lógica que cpuPerCoreHistory: la carga y la temperatura no
    // siempre se mueven juntas (throttling, límites térmicos) y verlas por separado da
    // más información real que un único gráfico de carga agrandado.
    gpuTempHistory: [] as number[],
    mem: null as client.MemInfo | null,
    disks: [] as client.DiskInfo[],
    processes: [] as client.ProcessInfo[],
    battery: null as client.BatteryInfo | null,
    netIfaces: [] as client.NetIface[],
    netHistory: [] as NetSample[],
    netConnections: [] as client.NetConnection[],
    host: null as client.HostInfo | null,
    externalIp: null as string | null,
    externalIpGeo: null as client.GeoRecord | null,
    externalIpAsn: null as client.AsnRecord | null,
    pingMs: null as number | null,
    fastTimer: null as ReturnType<typeof setInterval> | null,
    slowTimer: null as ReturnType<typeof setInterval> | null,
    prevNetTotals: null as NetSample | null,
  }),

  getters: {
    memUsedRatio(state): number {
      if (!state.mem || state.mem.total === 0) return 0;
      return state.mem.used / state.mem.total;
    },
  },

  actions: {
    // Se llama seguido (CPU/RAM/red cambian constante) — se agrupan acá en vez de que
    // cada panel dispare su propio poll independiente, a diferencia del Proxy
    // window.si del original donde Cpuinfo/Ramwatcher/Conninfo llamaban por separado.
    async pollFast(): Promise<void> {
      const [cpu, mem, ifaces, gpu] = await Promise.all([
        client.fetchCpu(),
        client.fetchMem(),
        client.fetchNetworkIfaces(),
        client.fetchGpu(),
      ]);
      this.cpu = cpu;
      this.mem = mem;
      this.netIfaces = ifaces;
      this.gpu = gpu;

      this.cpuHistory.push(cpu.globalUsage);
      if (this.cpuHistory.length > HISTORY_LENGTH) this.cpuHistory.shift();

      // Si cambia la cantidad de núcleos (no debería pasar en una sesión, pero por las
      // dudas) se reinicia el historial en vez de arrastrar arrays de otro tamaño.
      if (this.cpuPerCoreHistory.length !== cpu.perCore.length) {
        this.cpuPerCoreHistory = cpu.perCore.map(() => []);
      }
      cpu.perCore.forEach((usage, i) => {
        this.cpuPerCoreHistory[i].push(usage);
        if (this.cpuPerCoreHistory[i].length > HISTORY_LENGTH) this.cpuPerCoreHistory[i].shift();
      });

      if (gpu) {
        this.gpuHistory.push(gpu.loadPct);
        if (this.gpuHistory.length > HISTORY_LENGTH) this.gpuHistory.shift();
        if (gpu.temperatureC > 0) {
          this.gpuTempHistory.push(gpu.temperatureC);
          if (this.gpuTempHistory.length > HISTORY_LENGTH) this.gpuTempHistory.shift();
        }
      }

      const totals = ifaces.reduce<NetSample>(
        (acc, iface) => ({
          rx: acc.rx + iface.totalReceived,
          tx: acc.tx + iface.totalTransmitted,
        }),
        { rx: 0, tx: 0 },
      );
      if (this.prevNetTotals) {
        this.netHistory.push({
          rx: Math.max(0, totals.rx - this.prevNetTotals.rx),
          tx: Math.max(0, totals.tx - this.prevNetTotals.tx),
        });
        if (this.netHistory.length > HISTORY_LENGTH) this.netHistory.shift();
      }
      this.prevNetTotals = totals;
    },

    // Discos/procesos/batería/host/conexiones cambian poco entre polls — se refrescan
    // en un ciclo más espaciado para no recorrer la tabla de procesos ni la de sockets
    // TCP del sistema cada 1.5s sin necesidad.
    async pollSlow(): Promise<void> {
      const [disks, processes, battery, host, connections] = await Promise.all([
        client.fetchDisks(),
        client.fetchProcesses(8),
        client.fetchBattery(),
        client.fetchHost(),
        client.fetchNetworkConnections().catch(() => []),
      ]);
      this.disks = disks;
      this.processes = processes;
      this.battery = battery;
      this.host = host;
      this.netConnections = connections;
    },

    async refreshExternalIp(): Promise<void> {
      this.externalIp = await fetchExternalIp();
      if (this.externalIp) {
        const [geo, asn] = await Promise.all([
          client.geoipLookup(this.externalIp).catch(() => null),
          client.geoipAsnLookup(this.externalIp).catch(() => null),
        ]);
        this.externalIpGeo = geo;
        this.externalIpAsn = asn;
      }
    },

    async refreshPing(addr: string): Promise<void> {
      try {
        this.pingMs = await client.tcpPing(addr, 443);
      } catch {
        this.pingMs = null;
      }
    },

    start(pingAddr = "1.1.1.1"): void {
      if (this.fastTimer) return;

      void this.pollFast();
      void this.pollSlow();
      void this.refreshExternalIp();
      void this.refreshPing(pingAddr);

      this.fastTimer = setInterval(() => void this.pollFast(), FAST_POLL_MS);
      this.slowTimer = setInterval(() => {
        void this.pollSlow();
        void this.refreshPing(pingAddr);
      }, SLOW_POLL_MS);
    },

    stop(): void {
      if (this.fastTimer) clearInterval(this.fastTimer);
      if (this.slowTimer) clearInterval(this.slowTimer);
      this.fastTimer = null;
      this.slowTimer = null;
    },
  },
});
