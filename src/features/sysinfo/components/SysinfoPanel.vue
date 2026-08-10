<script setup lang="ts">
import { computed } from "vue";
import PanelBox from "@/shared/components/PanelBox.vue";
import { formatExactBytes, formatMemoryBytes, formatUptime } from "@/shared/utils/formatBytes";
import { batteryStateLabel } from "@/shared/utils/labels";
import { useSysinfoStore } from "../stores/sysinfo.store";

const store = useSysinfoStore();

const cpuPct = computed(() => Math.round(store.cpu?.globalUsage ?? 0));
const memPct = computed(() => Math.round(store.memUsedRatio * 100));
const uptime = computed(() => (store.host ? formatUptime(store.host.uptimeSecs) : "—"));

const batteryTimeLabel = computed(() => {
  const battery = store.battery;
  if (!battery) return null;
  if (battery.state === "Charging" && battery.timeToFullSecs) {
    return `${formatUptime(battery.timeToFullSecs)} para cargar`;
  }
  if (battery.timeToEmptySecs) {
    return `${formatUptime(battery.timeToEmptySecs)} restante`;
  }
  return null;
});
</script>

<template>
  <PanelBox title="Sistema">
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
    <div class="sysinfo-line" title="Tiempo que la PC lleva encendida sin reiniciar">
      <span>Uptime</span><span>{{ uptime }}</span>
    </div>
    <div
      v-if="store.mem"
      class="sysinfo-line"
      :title="`${formatExactBytes(store.mem.used)} usados de ${formatExactBytes(store.mem.total)}`"
    >
      <span>Memoria</span
      ><span
        >{{ formatMemoryBytes(store.mem.used) }} / {{ formatMemoryBytes(store.mem.total) }}</span
      >
    </div>
    <div
      v-if="store.mem && store.mem.totalSwap > 0"
      class="sysinfo-line"
      title="Memoria virtual en disco que Windows usa cuando la RAM se llena — más lenta que la RAM real"
    >
      <span>Swap</span
      ><span
        >{{ formatMemoryBytes(store.mem.usedSwap) }} /
        {{ formatMemoryBytes(store.mem.totalSwap) }}</span
      >
    </div>
    <div v-if="store.battery" class="sysinfo-line">
      <span>Batería</span
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
  width: 2.5vh;
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
  width: 3vh;
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
