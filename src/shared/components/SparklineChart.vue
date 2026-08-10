<script setup lang="ts">
import { onMounted, ref, watch } from "vue";

// Decisión de Fase 3 (ver plan_migracion Sección 6.8 / 3.4): en vez de sumar
// smoothie.js (sin mantenimiento desde ~2017, sin tipos) o uPlot (dependencia nueva)
// para gráficos de línea simples, se implementa un sparkline propio en Canvas 2D de
// ~40 líneas — cubre el mismo caso de uso (histórico corto, redibujado por poll) sin
// deuda de dependencia extra.
const props = withDefaults(defineProps<{ values: number[]; max?: number; height?: number }>(), {
  max: 100,
  height: 36,
});

const canvasRef = ref<HTMLCanvasElement | null>(null);

function draw(): void {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  // Redimensionar el buffer reinicia la matriz de transformación del canvas, así que
  // el scale() de abajo nunca se acumula entre redibujados sucesivos.
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  if (props.values.length < 2 || width === 0) return;

  const color = getComputedStyle(canvas).color || "lime";
  const stepX = width / (props.values.length - 1);

  ctx.beginPath();
  props.values.forEach((value, index) => {
    const x = index * stepX;
    const y = height - (Math.min(value, props.max) / props.max) * height;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.15;
  ctx.fill();
  ctx.globalAlpha = 1;
}

watch(() => props.values, draw, { deep: true });
onMounted(draw);
</script>

<template>
  <canvas ref="canvasRef" class="sparkline" :style="{ height: `${height}px` }"></canvas>
</template>

<style scoped>
.sparkline {
  width: 100%;
  display: block;
}
</style>
