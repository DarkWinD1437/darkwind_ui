<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import PanelBox from "@/shared/components/PanelBox.vue";
import { formatExactBytes, formatMemoryBytes, formatUptime } from "@/shared/utils/formatBytes";
import { batteryStateLabel } from "@/shared/utils/labels";
import { useSysinfoStore } from "../stores/sysinfo.store";

const { t } = useI18n();
const store = useSysinfoStore();

const cpuPct = computed(() => Math.round(store.cpu?.globalUsage ?? 0));
const memPct = computed(() => Math.round(store.memUsedRatio * 100));
const uptime = computed(() => (store.host ? formatUptime(store.host.uptimeSecs) : "—"));

const batteryTimeLabel = computed(() => {
  const battery = store.battery;
  if (!battery) return null;
  if (battery.state === "Charging" && battery.timeToFullSecs) {
    return t("panels.sysinfo.timeToFull", { time: formatUptime(battery.timeToFullSecs) });
  }
  if (battery.timeToEmptySecs) {
    return t("panels.sysinfo.timeRemaining", { time: formatUptime(battery.timeToEmptySecs) });
  }
  return null;
});
</script>

<template>
  <PanelBox :title="t('panels.sysinfo.title')" expandable>
    <div class="gauge-row">
      <span class="gauge-label">CPU</span>
      <div class="gauge-track"><div class="gauge-fill" :style="{ width: `${cpuPct}%` }" /></div>
      <span class="gauge-value">{{ cpuPct }}%</span>
    </div>
    <div class="gauge-row">
      <span class="gauge-label">RAM</span>
      <div class="gauge-track"><div class="gauge-fill" :style="{ width: `${memPct}%` }" /></div>
      <span class="gauge-value">{{ memPct }}%</span>
    </div>
    <div class="sysinfo-line" :title="t('panels.sysinfo.uptimeTooltip')">
      <span>{{ t("panels.sysinfo.uptime") }}</span><span>{{ uptime }}</span>
    </div>
    <div
      v-if="store.mem"
      class="sysinfo-line"
      :title="
        t('panels.sysinfo.memoryTooltip', {
          used: formatExactBytes(store.mem.used),
          total: formatExactBytes(store.mem.total),
        })
      "
    >
      <span>{{ t("panels.sysinfo.memory") }}</span
      ><span
        >{{ formatMemoryBytes(store.mem.used) }} / {{ formatMemoryBytes(store.mem.total) }}</span
      >
    </div>
    <div
      v-if="store.mem && store.mem.totalSwap > 0"
      class="sysinfo-line"
      :title="t('panels.sysinfo.swapTooltip')"
    >
      <span>{{ t("panels.sysinfo.swap") }}</span
      ><span
        >{{ formatMemoryBytes(store.mem.usedSwap) }} /
        {{ formatMemoryBytes(store.mem.totalSwap) }}</span
      >
    </div>
    <div v-if="store.battery" class="sysinfo-line">
      <span>{{ t("panels.sysinfo.battery") }}</span
      ><span
        >{{ Math.round(store.battery.percentage) }}% ({{
          batteryStateLabel(store.battery.state)
        }})</span
      >
    </div>
    <div v-if="batteryTimeLabel" class="sysinfo-line">
      <span></span><span>{{ batteryTimeLabel }}</span>
    </div>
  </PanelBox>
</template>

<style scoped>
.gauge-row {
  display: flex;
  align-items: center;
  gap: 0.4vh;
  margin-bottom: 0.35vh;
}
.gauge-label {
  /* Sin ancho fijo en vh: a la letra más grande del modal expandido de PanelBox
     (2.2vh vs. 0.85vh normal), un ancho fijo en vh se quedaba corto para "CPU"/"RAM" y
     el texto se superponía con la barra de al lado. Sin ancho forzado, se ajusta solo
     al contenido (3 letras, ya de por sí angosto) a cualquier tamaño de letra. */
  flex-shrink: 0;
  white-space: nowrap;
  opacity: 0.7;
}
.gauge-track {
  flex: 1;
  height: 0.8vh;
  background: rgba(var(--color_r), var(--color_g), var(--color_b), 0.15);
  overflow: hidden;
}
.gauge-fill {
  height: 100%;
  background: rgb(var(--color_r), var(--color_g), var(--color_b));
  transition: width 0.4s ease-out;
}
.gauge-value {
  flex-shrink: 0;
  white-space: nowrap;
  text-align: right;
  opacity: 0.85;
}
.sysinfo-line {
  display: flex;
  justify-content: space-between;
  opacity: 0.75;
  margin-top: 0.2vh;
}
</style>
