<script setup lang="ts">
import { computed } from "vue";
import PanelBox from "@/shared/components/PanelBox.vue";
import SparklineChart from "@/shared/components/SparklineChart.vue";
import { formatExactBytes, formatMemoryBytes } from "@/shared/utils/formatBytes";
import { useSysinfoStore } from "../stores/sysinfo.store";

// Capacidad nueva que el original nunca tuvo (solo reportaba CPU/RAM). Soporte
// multi-fabricante (NVIDIA/AMD/Intel) vía el comando sysinfo_gpu (crate gfxinfo).
const store = useSysinfoStore();

const gpu = computed(() => store.gpu);
const vramPct = computed(() => {
  if (!gpu.value || gpu.value.totalVram === 0) return 0;
  return Math.round((gpu.value.usedVram / gpu.value.totalVram) * 100);
});
const freeVram = computed(() => {
  if (!gpu.value) return 0;
  return Math.max(0, gpu.value.totalVram - gpu.value.usedVram);
});

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

// Promedio/pico sobre la ventana de historial visible (misma que alimenta los
// sparklines) — información real derivada de los datos ya trackeados, en vez de un
// texto fijo sin relación con la GPU que se está mirando.
const loadStats = computed(() => {
  if (store.gpuHistory.length === 0) return null;
  return { avg: Math.round(average(store.gpuHistory)), peak: Math.round(Math.max(...store.gpuHistory)) };
});
const tempStats = computed(() => {
  if (store.gpuTempHistory.length === 0) return null;
  return {
    avg: Math.round(average(store.gpuTempHistory)),
    peak: Math.round(Math.max(...store.gpuTempHistory)),
  };
});
</script>

<template>
  <PanelBox v-slot="{ expanded }" title="GPU" expandable>
    <template v-if="gpu">
      <div class="gpu-model" :class="{ 'gpu-model-expanded': expanded }">
        {{ gpu.vendor }} — {{ gpu.model }}
      </div>

      <!-- El valor numérico siempre va visible junto al gráfico, no solo al pasar el
           mouse ni reemplazado por el gráfico: con la GPU en reposo (carga/temp casi
           planas) la línea del sparkline queda pegada al borde y es casi imperceptible
           — el número es la fuente de información confiable, el gráfico es la tendencia. -->
      <div class="gpu-line">
        <span>Carga</span><span>{{ gpu.loadPct }}%</span>
      </div>
      <SparklineChart
        :values="store.gpuHistory"
        :max="100"
        :height="expanded ? 50 : 28"
        :title="expanded ? `Carga de la GPU — últimos ${store.gpuHistory.length} muestreos` : undefined"
      />

      <!-- Expandido: gráfico de temperatura separado del de carga, ya que no siempre se
           mueven juntos (throttling térmico, límites de potencia). -->
      <template v-if="expanded">
        <div class="gpu-line gpu-line-spaced">
          <span>Temp.</span
          ><span>{{ gpu.temperatureC > 0 ? `${gpu.temperatureC.toFixed(0)}°C` : "sensor no disponible" }}</span>
        </div>
        <SparklineChart
          v-if="gpu.temperatureC > 0"
          :values="store.gpuTempHistory"
          :max="100"
          :height="30"
          :title="`Temperatura de la GPU — últimos ${store.gpuTempHistory.length} muestreos`"
        />
      </template>
      <div v-else-if="gpu.temperatureC > 0" class="gpu-line">
        <span>Temp.</span><span>{{ gpu.temperatureC.toFixed(0) }}°C</span>
      </div>

      <!-- Compacto: texto plano. Expandido: barra de progreso, igual tratamiento que los
           gauges de CPU/RAM del panel Sistema, en vez de solo el número. -->
      <div
        v-if="gpu.totalVram > 0 && !expanded"
        class="gpu-line"
        title="Memoria dedicada de la GPU — separada de la RAM del sistema"
      >
        <span>VRAM</span
        ><span>{{ formatMemoryBytes(gpu.usedVram) }} / {{ formatMemoryBytes(gpu.totalVram) }}</span>
      </div>
      <template v-if="gpu.totalVram > 0 && expanded">
        <p
          class="gpu-subtitle"
          :title="`${formatExactBytes(gpu.usedVram)} usados de ${formatExactBytes(gpu.totalVram)}`"
        >
          VRAM — {{ formatMemoryBytes(gpu.usedVram) }} de {{ formatMemoryBytes(gpu.totalVram) }}
        </p>
        <div class="gauge-row">
          <div class="gauge-track"><div class="gauge-fill" :style="{ width: `${vramPct}%` }" /></div>
          <span class="gauge-value">{{ vramPct }}%</span>
        </div>
      </template>

      <!-- Estadísticas derivadas del propio historial de esta GPU (promedio/pico de
           carga y temperatura, VRAM libre) — información real y específica de esta
           tarjeta, no un texto fijo. -->
      <div v-if="expanded" class="gpu-stats">
        <div v-if="gpu.totalVram > 0" class="gpu-line">
          <span>VRAM libre</span><span>{{ formatMemoryBytes(freeVram) }}</span>
        </div>
        <div v-if="loadStats" class="gpu-line" title="Calculado sobre el historial visible en el gráfico de carga">
          <span>Carga — promedio / pico</span><span>{{ loadStats.avg }}% / {{ loadStats.peak }}%</span>
        </div>
        <div
          v-if="tempStats"
          class="gpu-line"
          title="Calculado sobre el historial visible en el gráfico de temperatura"
        >
          <span>Temp. — promedio / pico</span><span>{{ tempStats.avg }}°C / {{ tempStats.peak }}°C</span>
        </div>
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
.gpu-model-expanded {
  white-space: normal;
  font-weight: bold;
  margin-bottom: 1vh;
}
.gpu-subtitle {
  margin: 1vh 0 0.3vh;
  opacity: 0.7;
  font-size: 0.85em;
}
.gpu-line {
  display: flex;
  justify-content: space-between;
  opacity: 0.75;
}
.gpu-line-spaced {
  margin-top: 1vh;
}
.gpu-stats {
  margin-top: 1vh;
  padding-top: 0.6vh;
  border-top: 1px solid rgba(var(--color_r), var(--color_g), var(--color_b), 0.2);
  display: flex;
  flex-direction: column;
  gap: 0.3vh;
}
.gpu-empty {
  opacity: 0.5;
}
.gauge-row {
  display: flex;
  align-items: center;
  gap: 0.6vh;
}
.gauge-track {
  flex: 1;
  height: 1vh;
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
</style>
