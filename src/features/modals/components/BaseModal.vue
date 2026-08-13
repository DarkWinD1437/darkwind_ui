<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useModalStack } from "@/shared/composables/useModalStack";

const props = withDefaults(
  defineProps<{
    title: string;
    closable?: boolean;
    draggable?: boolean;
    width?: string;
  }>(),
  { closable: true, draggable: true, width: "40vw" },
);
const emit = defineEmits<{ close: [] }>();

const { zIndex, isTopmost } = useModalStack();

// Arrastre simple por la barra de título: el original no tenía esto (sus modales eran
// fijos), pero con varios modales pudiendo estar abiertos a la vez (ej. Settings +
// un modal de confirmación) poder moverlos evita que uno tape por completo al otro.
const dragOffset = ref({ x: 0, y: 0 });
let dragging = false;
let dragStart = { x: 0, y: 0 };

function onDragStart(event: MouseEvent): void {
  if (!props.draggable) return;
  dragging = true;
  dragStart = { x: event.clientX - dragOffset.value.x, y: event.clientY - dragOffset.value.y };
  window.addEventListener("mousemove", onDragMove);
  window.addEventListener("mouseup", onDragEnd);
}
function onDragMove(event: MouseEvent): void {
  if (!dragging) return;
  dragOffset.value = { x: event.clientX - dragStart.x, y: event.clientY - dragStart.y };
}
function onDragEnd(): void {
  dragging = false;
  window.removeEventListener("mousemove", onDragMove);
  window.removeEventListener("mouseup", onDragEnd);
}

function close(): void {
  if (props.closable) emit("close");
}

// captura=true: xterm.js corta la propagación de keydown en fase de burbuja con la
// terminal enfocada — mismo motivo que el resto de los atajos globales de la app.
function handleKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape" && props.closable && isTopmost()) {
    event.preventDefault();
    close();
  }
}

onMounted(() => window.addEventListener("keydown", handleKeydown, true));
onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleKeydown, true);
  window.removeEventListener("mousemove", onDragMove);
  window.removeEventListener("mouseup", onDragEnd);
});
</script>

<template>
  <Teleport to="body">
    <div class="base-modal-overlay" :style="{ zIndex }" @click.self="close">
      <div
        class="base-modal"
        data-augmented-ui="tr-clip bl-clip border"
        :style="{ width, transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)` }"
      >
        <div
          class="base-modal-header"
          :class="{ draggable }"
          @mousedown="onDragStart"
        >
          <span class="base-modal-title">{{ title }}</span>
          <button
            v-if="closable"
            type="button"
            class="base-modal-close"
            title="Cerrar"
            @mousedown.stop
            @click="close"
          >
            ✕
          </button>
        </div>
        <div class="base-modal-body">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.base-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
}
.base-modal {
  --aug-border-all: 0.18vh;
  --aug-border-bg: rgb(var(--color_r), var(--color_g), var(--color_b));
  background: var(--color_light_black);
  color: rgb(var(--color_r), var(--color_g), var(--color_b));
  max-width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  font-family: var(--font_main), sans-serif;
}
.base-modal-header {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.2vh 1.6vh;
  font-size: calc(1.6vh * var(--ui-font-scale, 1));
  text-transform: uppercase;
  letter-spacing: 0.05vh;
  border-bottom: 0.09vh solid rgba(var(--color_r), var(--color_g), var(--color_b), 0.3);
}
.base-modal-header.draggable {
  cursor: move;
  user-select: none;
}
.base-modal-close {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: calc(1.5vh * var(--ui-font-scale, 1));
  opacity: 0.75;
}
.base-modal-close:hover {
  opacity: 1;
}
.base-modal-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 1.6vh;
  /* Antes 1.1vh (~12px en 1080p) — casi ilegible en un modal pensado para leerse de
     cerca, no de reojo como los paneles compactos de la columna lateral. Reportado
     por el usuario. */
  font-size: calc(1.6vh * var(--ui-font-scale, 1));
}
.base-modal-body::-webkit-scrollbar {
  width: 0.7vh;
}
.base-modal-body::-webkit-scrollbar-track {
  background: rgba(var(--color_r), var(--color_g), var(--color_b), 0.08);
}
.base-modal-body::-webkit-scrollbar-thumb {
  background: rgba(var(--color_r), var(--color_g), var(--color_b), 0.4);
}
.base-modal-body::-webkit-scrollbar-thumb:hover {
  background: rgba(var(--color_r), var(--color_g), var(--color_b), 0.65);
}
</style>
