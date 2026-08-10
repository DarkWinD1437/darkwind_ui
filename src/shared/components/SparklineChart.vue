<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";

// En vez de sumar smoothie.js (sin mantenimiento desde ~2017, sin tipos) o uPlot
// (dependencia nueva) para gráficos de línea simples, se implementa un sparkline
// propio en Canvas 2D de ~40 líneas — cubre el mismo caso de uso (histórico corto,
// redibujado por poll) sin deuda de dependencia extra.
const props = withDefaults(defineProps<{ values: number[]; max?: number; height?: number }>(), {
  max: 100,
  height: 36,
});

const canvasRef = ref<HTMLCanvasElement | null>(null);
let resizeObserver: ResizeObserver | null = null;
const LINE_WIDTH = 1.5;

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

  if (props.values.length < 2 || width === 0 || height === 0) return;

  const color = getComputedStyle(canvas).color || "lime";
  const stepX = width / (props.values.length - 1);
  // El trazo se recorta contra el borde del canvas si el valor cae justo en 0 o en el
  // máximo (la mitad del grosor de línea queda fuera del área visible) — se deja un
  // margen de medio lineWidth arriba/abajo para que una serie plana en 0% (ej. GPU
  // inactiva) o en el máximo siga viéndose como una línea completa, no un borde cortado.
  const margin = LINE_WIDTH / 2;
  const plottableHeight = Math.max(0, height - margin * 2);

  ctx.beginPath();
  props.values.forEach((value, index) => {
    const x = index * stepX;
    const ratio = Math.min(value, props.max) / props.max;
    const y = margin + (plottableHeight - ratio * plottableHeight);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = LINE_WIDTH;
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

onMounted(() => {
  draw();
  // Sin esto, un canvas persistente (no recreado al abrir un modal, ej. los gráficos de
  // CpuinfoPanel/GpuPanel que solo cambian su prop `height` al expandirse) queda con el
  // buffer dibujado al tamaño chico del panel compacto hasta el próximo cambio de
  // `values` — mientras tanto el navegador estira ese bitmap viejo al nuevo tamaño CSS,
  // lo que con una serie casi plana (carga/temperatura en reposo) se ve como vacío.
  resizeObserver = new ResizeObserver(draw);
  if (canvasRef.value) resizeObserver.observe(canvasRef.value);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
});
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
