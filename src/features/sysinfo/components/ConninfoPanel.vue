<script setup lang="ts">
import { computed } from "vue";
import PanelBox from "@/shared/components/PanelBox.vue";
import SparklineChart from "@/shared/components/SparklineChart.vue";
import { formatBytesPerSec } from "@/shared/utils/formatBytes";
import { useSysinfoStore } from "../stores/sysinfo.store";

const store = useSysinfoStore();

const rxHistory = computed(() => store.netHistory.map((s) => s.rx));
const txHistory = computed(() => store.netHistory.map((s) => s.tx));
const rxMax = computed(() => Math.max(1024, ...rxHistory.value));
const txMax = computed(() => Math.max(1024, ...txHistory.value));
const lastRx = computed(() =>
  rxHistory.value.length > 0 ? rxHistory.value[rxHistory.value.length - 1] : 0,
);
const lastTx = computed(() =>
  txHistory.value.length > 0 ? txHistory.value[txHistory.value.length - 1] : 0,
);
</script>

<template>
  <PanelBox title="Tráfico de red" expandable>
    <div
      class="conn-row"
      title="Velocidad de descarga (datos que entran a tu PC) de todas tus interfaces de red sumadas"
    >
      <span>↓ {{ formatBytesPerSec(lastRx) }}</span>
    </div>
    <SparklineChart :values="rxHistory" :max="rxMax" :height="24" />
    <div
      class="conn-row"
      title="Velocidad de subida (datos que salen de tu PC) de todas tus interfaces de red sumadas"
    >
      <span>↑ {{ formatBytesPerSec(lastTx) }}</span>
    </div>
    <SparklineChart :values="txHistory" :max="txMax" :height="24" />
  </PanelBox>
</template>

<style scoped>
.conn-row {
  display: flex;
  justify-content: space-between;
  opacity: 0.75;
  margin-top: 0.3vh;
}
</style>
