<script setup lang="ts">
import { computed } from "vue";
import PanelBox from "@/shared/components/PanelBox.vue";
import SparklineChart from "@/shared/components/SparklineChart.vue";
import { useSysinfoStore } from "../stores/sysinfo.store";

const store = useSysinfoStore();

const perCore = computed(() => store.cpu?.perCore ?? []);
</script>

<template>
  <PanelBox title="CPU por núcleo">
    <SparklineChart :values="store.cpuHistory" :max="100" :height="32" />
    <div class="core-grid">
      <div
        v-for="(usage, index) in perCore"
        :key="index"
        class="core-cell"
        :title="`Núcleo ${index}: ${Math.round(usage)}%`"
      >
        <div class="core-fill" :style="{ height: `${Math.max(2, Math.round(usage))}%` }" />
      </div>
    </div>
    <div
      v-if="store.cpu"
      class="cpu-line"
      title="Velocidad de reloj promedio actual de los núcleos, en megahercios"
    >
      <span>Frecuencia</span><span>{{ store.cpu.frequencyMhz }} MHz</span>
    </div>
    <div
      v-if="store.cpu?.temperatureC != null"
      class="cpu-line"
      title="Sensor de temperatura general del sistema (Windows no siempre expone un sensor específico por CPU)"
    >
      <span>Temp.</span><span>{{ store.cpu.temperatureC.toFixed(0) }}°C</span>
    </div>
  </PanelBox>
</template>

<style scoped>
.core-grid {
  margin-top: 0.5vh;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(0.6vh, 1fr));
  gap: 0.15vh;
  height: 2.2vh;
}
.core-cell {
  display: flex;
  align-items: flex-end;
  background: rgba(var(--color_r), var(--color_g), var(--color_b), 0.12);
}
.core-fill {
  width: 100%;
  background: rgb(var(--color_r), var(--color_g), var(--color_b));
  transition: height 0.4s ease-out;
}
.cpu-line {
  display: flex;
  justify-content: space-between;
  opacity: 0.75;
  margin-top: 0.3vh;
}
</style>
