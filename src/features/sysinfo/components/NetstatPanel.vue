<script setup lang="ts">
import { computed } from "vue";
import PanelBox from "@/shared/components/PanelBox.vue";
import { useSysinfoStore } from "../stores/sysinfo.store";

const store = useSysinfoStore();

const location = computed(() => {
  const geo = store.externalIpGeo;
  if (!geo || (!geo.city && !geo.country)) return "N/D";
  return [geo.city, geo.country].filter(Boolean).join(", ");
});

const isp = computed(() => store.externalIpAsn?.organization ?? null);

// Primera interfaz "real" con una IP no-loopback — heurística simple para mostrar
// "tu IP en la red local", igual que vería el usuario con `ipconfig`.
const localIface = computed(() => {
  for (const iface of store.netIfaces) {
    const ip = iface.ipAddresses.find(
      (addr) => !addr.startsWith("127.") && !addr.includes("::1") && addr !== "0.0.0.0",
    );
    if (ip) return { name: iface.name, ip };
  }
  return null;
});

// Compacto: 3 líneas para no invadir el espacio del teclado debajo de esta columna.
// Expandido (modal de PanelBox): la lista completa, sin recorte.
function visibleConnections(expanded: boolean) {
  return expanded ? store.netConnections : store.netConnections.slice(0, 3);
}
</script>

<template>
  <PanelBox v-slot="{ expanded }" title="Red" expandable>
    <div
      class="net-line"
      title="La IP con la que te ve el resto de internet (no la de tu red local)"
    >
      <span>IP externa</span><span>{{ store.externalIp ?? "…" }}</span>
    </div>
    <div
      class="net-line"
      title="Ubicación aproximada asociada a tu IP externa, no tu ubicación exacta"
    >
      <span>Ubicación</span><span>{{ location }}</span>
    </div>
    <div
      v-if="isp"
      class="net-line"
      title="Proveedor de Internet (organización dueña de tu IP externa)"
    >
      <span>ISP</span><span class="net-value">{{ isp }}</span>
    </div>
    <div
      v-if="localIface"
      class="net-line"
      title="Tu IP dentro de la red local (WiFi/Ethernet), la que usan otros dispositivos de tu casa/oficina para verte"
    >
      <span>IP local</span
      ><span class="net-value">{{ localIface.ip }} ({{ localIface.name }})</span>
    </div>
    <div
      class="net-line"
      title="Tiempo de ida y vuelta de un paquete de red, en milisegundos — más bajo es mejor"
    >
      <span>Ping</span>
      <span>{{ store.pingMs !== null ? `${store.pingMs} ms` : "N/D" }}</span>
    </div>

    <div
      class="net-conn-title"
      title="Conexiones TCP reales con un servidor remoto — no incluye programas solo escuchando localmente"
    >
      Conexiones activas{{ expanded ? ` (${store.netConnections.length})` : "" }}
    </div>
    <div
      v-for="(conn, i) in visibleConnections(expanded)"
      :key="i"
      class="net-conn-line"
      :title="`${conn.processName ?? 'proceso desconocido'} conectado a ${conn.remoteAddr}:${conn.remotePort}${conn.remoteOrg ? ` (${conn.remoteOrg})` : ''}`"
    >
      <span class="net-conn-main">
        <span class="net-conn-process">{{ conn.processName ?? "?" }}</span>
        → {{ conn.remoteAddr }}:{{ conn.remotePort }}
        <span v-if="expanded" class="net-conn-local">(local: {{ conn.localPort }})</span>
      </span>
      <span class="net-conn-org">{{ conn.remoteOrg ?? "" }}</span>
    </div>
    <div v-if="store.netConnections.length === 0" class="net-conn-empty">
      Sin conexiones TCP activas
    </div>
    <div v-else-if="!expanded && store.netConnections.length > 3" class="net-conn-more-hint">
      +{{ store.netConnections.length - 3 }} más — click en el título para ver todas
    </div>
  </PanelBox>
</template>

<style scoped>
.net-line {
  display: flex;
  justify-content: space-between;
  gap: 0.5vh;
  opacity: 0.85;
  margin-bottom: 0.15vh;
}
.net-value {
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.net-conn-title {
  margin-top: 0.5vh;
  opacity: 0.6;
  border-top: 0.09vh solid rgba(var(--color_r), var(--color_g), var(--color_b), 0.2);
  padding-top: 0.3vh;
}
.net-conn-line {
  display: flex;
  flex-direction: column;
  margin-bottom: 0.2vh;
  opacity: 0.75;
}
.net-conn-main {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.net-conn-process {
  font-weight: bold;
}
.net-conn-local {
  opacity: 0.6;
  font-size: 0.85em;
}
.net-conn-org {
  opacity: 0.6;
  font-size: 0.85em;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.net-conn-empty,
.net-conn-more-hint {
  opacity: 0.5;
  font-size: 0.85em;
}
</style>
