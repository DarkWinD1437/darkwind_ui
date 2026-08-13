<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { convertFileSrc } from "@tauri-apps/api/core";
import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";
import BaseModal from "@/features/modals/components/BaseModal.vue";
import { useDocReaderStore } from "../stores/docReader.store";

// El original nunca tuvo un visor de PDF integrado (docReader.class.js del proyecto de
// referencia sí, portado acá) — pdfjs-dist necesita su worker corriendo en un thread
// aparte para no bloquear el hilo principal al parsear PDFs grandes; Vite resuelve el
// import `?url` a la URL final del worker ya bundleado.
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const { t } = useI18n();
const store = useDocReaderStore();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const pageNum = ref(1);
const pageCount = ref(0);
const scale = ref(1.2);
const loading = ref(false);
const error = ref(false);
let doc: PDFDocumentProxy | null = null;

async function renderPage(): Promise<void> {
  if (!doc || !canvasRef.value) return;
  const page = await doc.getPage(pageNum.value);
  const viewport = page.getViewport({ scale: scale.value });
  const canvas = canvasRef.value;
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvas, viewport }).promise;
}

async function loadDocument(path: string): Promise<void> {
  loading.value = true;
  error.value = false;
  pageNum.value = 1;
  try {
    const url = convertFileSrc(path);
    doc = await pdfjsLib.getDocument({ url }).promise;
    pageCount.value = doc.numPages;
    await renderPage();
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

function prevPage(): void {
  if (pageNum.value <= 1) return;
  pageNum.value--;
  void renderPage();
}
function nextPage(): void {
  if (pageNum.value >= pageCount.value) return;
  pageNum.value++;
  void renderPage();
}
function zoomOut(): void {
  scale.value = Math.max(0.4, Math.round((scale.value - 0.2) * 10) / 10);
  void renderPage();
}
function zoomIn(): void {
  scale.value = Math.min(5, Math.round((scale.value + 0.2) * 10) / 10);
  void renderPage();
}

function disposeDocument(): void {
  // destroy() vive en loadingTask (el objeto devuelto por getDocument() antes de
  // awaitear .promise), no en PDFDocumentProxy — este getter es el único link de vuelta.
  void doc?.loadingTask.destroy();
  doc = null;
}

watch(
  () => store.path,
  (path) => {
    disposeDocument();
    if (path) void loadDocument(path);
  },
);

onBeforeUnmount(disposeDocument);
</script>

<template>
  <BaseModal v-if="store.path" :title="t('docReader.title')" width="55vw" @close="store.close()">
    <div class="doc-toolbar">
      <button type="button" :disabled="pageNum <= 1" @click="prevPage">‹</button>
      <span class="doc-page-indicator">{{ pageNum }} / {{ pageCount || "…" }}</span>
      <button type="button" :disabled="pageNum >= pageCount" @click="nextPage">›</button>
      <span class="doc-spacer"></span>
      <button type="button" @click="zoomOut">−</button>
      <span>{{ Math.round(scale * 100) }}%</span>
      <button type="button" @click="zoomIn">+</button>
    </div>
    <div class="doc-canvas-wrap">
      <p v-if="error" class="doc-message">{{ t("docReader.error") }}</p>
      <p v-else-if="loading" class="doc-message">{{ t("docReader.loading") }}</p>
      <canvas v-show="!loading && !error" ref="canvasRef" class="doc-canvas"></canvas>
    </div>
  </BaseModal>
</template>

<style scoped>
.doc-toolbar {
  display: flex;
  align-items: center;
  gap: 0.6vh;
  margin-bottom: 0.8vh;
  padding-bottom: 0.6vh;
  border-bottom: 0.09vh solid rgba(var(--color_r), var(--color_g), var(--color_b), 0.25);
}
.doc-toolbar button {
  background: rgba(var(--color_r), var(--color_g), var(--color_b), 0.1);
  border: 0.09vh solid rgba(var(--color_r), var(--color_g), var(--color_b), 0.4);
  color: inherit;
  cursor: pointer;
  font-size: calc(1.3vh * var(--ui-font-scale, 1));
  padding: 0.3vh 0.8vh;
}
.doc-toolbar button:disabled {
  opacity: 0.3;
  cursor: default;
}
.doc-page-indicator {
  font-size: calc(1.2vh * var(--ui-font-scale, 1));
  opacity: 0.85;
  white-space: nowrap;
}
.doc-spacer {
  flex: 1;
}
/* Antes el canvas tenía max-width:100%, así que aumentar el zoom lo renderizaba más
   grande pero el CSS lo volvía a achicar al ancho del modal — el zoom quedaba
   invisible pasado cierto punto. Ahora crece de verdad y este contenedor scrollea. */
.doc-canvas-wrap {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 20vh;
  max-height: 60vh;
  overflow: auto;
}
.doc-canvas {
  box-shadow: 0 0 1vh rgba(0, 0, 0, 0.5);
  flex-shrink: 0;
}
.doc-message {
  opacity: 0.6;
  font-size: calc(1.2vh * var(--ui-font-scale, 1));
}
</style>
