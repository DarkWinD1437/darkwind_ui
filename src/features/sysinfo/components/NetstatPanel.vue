<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import PanelBox from "@/shared/components/PanelBox.vue";
import { useSysinfoStore } from "../stores/sysinfo.store";

const { t } = useI18n();
const store = useSysinfoStore();

const location = computed(() => {
  const geo = store.externalIpGeo;
  if (!geo || (!geo.city && !geo.country)) return t("panels.netstat.notAvailable");
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
  <PanelBox v-slot="{ expanded }" :title="t('panels.netstat.title')" expandable>
    <div class="net-line" :title="t('panels.netstat.externalIpTooltip')">
      <span>{{ t("panels.netstat.externalIp") }}</span><span>{{ store.externalIp ?? "…" }}</span>
    </div>
    <div class="net-line" :title="t('panels.netstat.locationTooltip')">
      <span>{{ t("panels.netstat.location") }}</span><span>{{ location }}</span>
    </div>
    <div v-if="isp" class="net-line" :title="t('panels.netstat.ispTooltip')">
      <span>ISP</span><span class="net-value">{{ isp }}</span>
    </div>
    <div v-if="localIface" class="net-line" :title="t('panels.netstat.localIpTooltip')">
      <span>{{ t("panels.netstat.localIp") }}</span
      ><span class="net-value">{{ localIface.ip }} ({{ localIface.name }})</span>
    </div>
    <div class="net-line" :title="t('panels.netstat.pingTooltip')">
      <span>Ping</span>
      <span>{{ store.pingMs !== null ? `${store.pingMs} ms` : t("panels.netstat.notAvailable") }}</span>
    </div>

    <div class="net-conn-title" :title="t('panels.netstat.connectionsTooltip')">
      {{ t("panels.netstat.activeConnections") }}{{ expanded ? ` (${store.netConnections.length})` : "" }}
    </div>
    <div
      v-for="(conn, i) in visibleConnections(expanded)"
      :key="i"
      class="net-conn-line"
      :title="
        t('panels.netstat.connectionTooltip', {
          process: conn.processName ?? t('panels.netstat.unknownProcess'),
          addr: conn.remoteAddr,
          port: conn.remotePort,
          org: conn.remoteOrg ? ` (${conn.remoteOrg})` : '',
        })
      "
    >
      <span class="net-conn-main">
        <span class="net-conn-process">{{ conn.processName ?? "?" }}</span>
        → {{ conn.remoteAddr }}:{{ conn.remotePort }}
        <span v-if="expanded" class="net-conn-local">({{ t("panels.netstat.local") }}: {{ conn.localPort }})</span>
      </span>
      <span class="net-conn-org">{{ conn.remoteOrg ?? "" }}</span>
    </div>
    <div v-if="store.netConnections.length === 0" class="net-conn-empty">
      {{ t("panels.netstat.noConnections") }}
    </div>
    <div v-else-if="!expanded && store.netConnections.length > 3" class="net-conn-more-hint">
      {{ t("panels.netstat.moreHint", { count: store.netConnections.length - 3 }) }}
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
