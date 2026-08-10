<script setup lang="ts">
import { computed, ref } from "vue";
import PanelBox from "@/shared/components/PanelBox.vue";
import { formatMemoryBytes } from "@/shared/utils/formatBytes";
import { useSysinfoStore } from "../stores/sysinfo.store";

const store = useSysinfoStore();
const showAll = ref(false);

const topFive = computed(() => store.processes.slice(0, 5));
</script>

<template>
  <PanelBox title="Procesos">
    <div v-for="proc in topFive" :key="proc.pid" class="proc-line">
      <span class="proc-name">{{ proc.name }}</span>
      <span class="proc-cpu">{{ Math.round(proc.cpuUsage) }}%</span>
    </div>
    <button type="button" class="proc-more" @click="showAll = true">Ver todos</button>

    <!--
      Modal simplificado y autocontenido: el sistema de modales genérico
      (features/modals, ver plan_migracion Fase 5) todavía no existe en esta fase.
      Se reemplaza este overlay cuando ese sistema esté disponible.
    -->
    <Teleport to="body">
      <div v-if="showAll" class="toplist-overlay" @click.self="showAll = false">
        <div class="toplist-modal" data-augmented-ui="tr-clip bl-clip border">
          <div class="toplist-modal-header">
            <span>PROCESOS ACTIVOS</span>
            <button type="button" @click="showAll = false">✕</button>
          </div>
          <table class="toplist-table">
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
        </div>
      </div>
    </Teleport>
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
.proc-more {
  margin-top: 0.4vh;
  background: none;
  border: none;
  color: rgb(var(--color_r), var(--color_g), var(--color_b));
  opacity: 0.6;
  cursor: pointer;
  padding: 0;
  font-size: 0.85vh;
  text-decoration: underline;
}
.proc-more:hover {
  opacity: 1;
}

.toplist-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.toplist-modal {
  --aug-border-all: 0.18vh;
  --aug-border-bg: rgb(var(--color_r), var(--color_g), var(--color_b));
  background: var(--color_light_black);
  color: rgb(var(--color_r), var(--color_g), var(--color_b));
  width: 42vw;
  max-height: 60vh;
  overflow-y: auto;
  padding: 1.2vh;
  font-family: var(--font_main), sans-serif;
}
.toplist-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.8vh;
  font-size: 1.1vh;
}
.toplist-modal-header button {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
}
.toplist-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9vh;
}
.toplist-table th {
  text-align: left;
  opacity: 0.6;
  border-bottom: 0.09vh solid rgba(var(--color_r), var(--color_g), var(--color_b), 0.35);
  padding-bottom: 0.3vh;
}
.toplist-table td {
  padding: 0.2vh 0.4vh 0.2vh 0;
}
.proc-exe-path {
  opacity: 0.5;
  font-size: 0.85em;
  max-width: 18vw;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
