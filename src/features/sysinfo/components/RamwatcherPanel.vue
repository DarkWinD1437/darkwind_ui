<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import PanelBox from "@/shared/components/PanelBox.vue";
import { useSysinfoStore } from "../stores/sysinfo.store";

// Decisión de plan_migracion Sección 6.9 (ítem 3.5 de Fase 3): el grid de 440 celdas
// del original son <div> DOM reales, con su costo de layout/repintado en cada refresh.
// Acá se redibuja como un único <canvas>, eliminando ese costo por celda.
const COLUMNS = 22;
const ROWS = 20;
const CELL_COUNT = COLUMNS * ROWS;
const GAP = 1;

const store = useSysinfoStore();
const canvasRef = ref<HTMLCanvasElement | null>(null);
let resizeObserver: ResizeObserver | null = null;

function accentRgb(canvas: HTMLCanvasElement): string {
  const resolved = getComputedStyle(canvas).color;
  const match = resolved.match(/\d+/g);
  return match ? match.slice(0, 3).join(", ") : "170, 207, 209";
}

function draw(): void {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (width === 0 || height === 0) return;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  const rgb = accentRgb(canvas);
  const litCells = Math.round(store.memUsedRatio * CELL_COUNT);
  const cellWidth = (width - GAP * (COLUMNS - 1)) / COLUMNS;
  const cellHeight = (height - GAP * (ROWS - 1)) / ROWS;

  for (let i = 0; i < CELL_COUNT; i++) {
    const col = i % COLUMNS;
    const row = Math.floor(i / COLUMNS);
    const x = col * (cellWidth + GAP);
    const y = row * (cellHeight + GAP);
    ctx.fillStyle = i < litCells ? `rgb(${rgb})` : `rgba(${rgb}, 0.12)`;
    ctx.fillRect(x, y, cellWidth, cellHeight);
  }
}

watch(() => store.memUsedRatio, draw);

onMounted(() => {
  draw();
  resizeObserver = new ResizeObserver(draw);
  if (canvasRef.value) resizeObserver.observe(canvasRef.value);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
});
</script>

<template>
  <PanelBox title="Mapa de RAM">
    <canvas
      ref="canvasRef"
      class="ram-canvas"
      title="Cada celda es una porción fija de tu RAM total — las celdas encendidas muestran cuánto está en uso ahora"
    ></canvas>
  </PanelBox>
</template>

<style scoped>
.ram-canvas {
  width: 100%;
  height: 8vh;
  display: block;
}
</style>
