<script setup lang="ts">
import { computed } from "vue";
import PanelBox from "@/shared/components/PanelBox.vue";
import { formatMemoryBytes } from "@/shared/utils/formatBytes";
import { useSysinfoStore } from "../stores/sysinfo.store";

const store = useSysinfoStore();

const topFive = computed(() => store.processes.slice(0, 5));
</script>

<template>
  <PanelBox v-slot="{ expanded }" title="Procesos" expandable>
    <template v-if="expanded">
      <table class="proc-table">
        <thead>
          <tr>
            <th title="Identificador único que Windows le asigna a cada proceso">PID</th>
            <th>Nombre</th>
            <th>CPU</th>
            <th>Memoria</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="proc in store.processes"
            :key="proc.pid"
            :title="proc.cmd || 'Sin línea de comandos disponible'"
          >
            <td>{{ proc.pid }}</td>
            <td>
              <div>{{ proc.name }}</div>
              <div v-if="proc.exe" class="proc-exe-path">{{ proc.exe }}</div>
            </td>
            <td>{{ Math.round(proc.cpuUsage) }}%</td>
            <td>{{ formatMemoryBytes(proc.memory) }}</td>
          </tr>
        </tbody>
      </table>
    </template>
    <template v-else>
      <div v-for="proc in topFive" :key="proc.pid" class="proc-line">
        <span class="proc-name">{{ proc.name }}</span>
        <span class="proc-cpu">{{ Math.round(proc.cpuUsage) }}%</span>
      </div>
    </template>
  </PanelBox>
</template>

<style scoped>
.proc-line {
  display: flex;
  justify-content: space-between;
  opacity: 0.85;
}
.proc-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.proc-table {
  width: 100%;
  border-collapse: collapse;
}
.proc-table th {
  text-align: left;
  opacity: 0.6;
  border-bottom: 0.09vh solid rgba(var(--color_r), var(--color_g), var(--color_b), 0.35);
  padding-bottom: 0.3vh;
}
.proc-table td {
  padding: 0.3vh 0.6vh 0.3vh 0;
}
.proc-exe-path {
  opacity: 0.5;
  font-size: 0.8em;
  max-width: 24vw;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
