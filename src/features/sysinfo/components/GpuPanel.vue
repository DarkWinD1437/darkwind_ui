<script setup lang="ts">
import { computed } from "vue";
import PanelBox from "@/shared/components/PanelBox.vue";
import SparklineChart from "@/shared/components/SparklineChart.vue";
import { formatMemoryBytes } from "@/shared/utils/formatBytes";
import { useSysinfoStore } from "../stores/sysinfo.store";

// Capacidad nueva que el original nunca tuvo (solo reportaba CPU/RAM) — ver
// plan_migracion Sección 6.9. Soporte multi-fabricante (NVIDIA/AMD/Intel) vía gfxinfo.
const store = useSysinfoStore();

const gpu = computed(() => store.gpu);
</script>

<template>
  <PanelBox title="GPU">
    <template v-if="gpu">
      <div class="gpu-model">{{ gpu.vendor }} — {{ gpu.model }}</div>
      <SparklineChart :values="store.gpuHistory" :max="100" :height="28" />
      <div class="gpu-line">
        <span>Carga</span><span>{{ gpu.loadPct }}%</span>
      </div>
      <div v-if="gpu.temperatureC > 0" class="gpu-line">
        <span>Temp.</span><span>{{ gpu.temperatureC.toFixed(0) }}°C</span>
      </div>
      <div
        v-if="gpu.totalVram > 0"
        class="gpu-line"
        title="Memoria dedicada de la GPU — separada de la RAM del sistema"
      >
        <span>VRAM</span
        ><span>{{ formatMemoryBytes(gpu.usedVram) }} / {{ formatMemoryBytes(gpu.totalVram) }}</span>
      </div>
    </template>
    <div v-else class="gpu-empty">GPU no detectada</div>
  </PanelBox>
</template>

<style scoped>
.gpu-model {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  opacity: 0.85;
  margin-bottom: 0.3vh;
}
.gpu-line {
  display: flex;
  justify-content: space-between;
  opacity: 0.75;
}
.gpu-empty {
  opacity: 0.5;
}
</style>
