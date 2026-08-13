<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { useFilesystemStore } from "@/features/filesystem/stores/filesystem.store";
import { useTerminalsStore } from "@/features/terminal/stores/terminals.store";
import { useKeyboardStore } from "@/features/keyboard/stores/keyboard.store";
import { registerShortcutAction } from "@/features/shortcuts/composables/useShortcutActions";

const filesystemStore = useFilesystemStore();
const terminalsStore = useTerminalsStore();
const keyboardStore = useKeyboardStore();

const open = ref(false);
const query = ref("");
const selectedIndex = ref(0);
const inputEl = ref<HTMLInputElement | null>(null);

// Búsqueda por substring case-insensitive sobre el listado ya cargado en el store de
// filesystem (no re-lee el disco, ni indexa subcarpetas — mismo alcance que el
// original: solo el directorio actualmente visible en el panel). Los que además
// empiezan con el texto buscado se muestran primero.
const matches = computed(() => {
  const text = query.value.toLowerCase();
  if (!text) return [];
  const found = filesystemStore.entries
    .filter((e) => e.name.toLowerCase().includes(text))
    .slice(0, 5);
  return found.sort((a, b) => {
    const aStarts = a.name.toLowerCase().startsWith(text);
    const bStarts = b.name.toLowerCase().startsWith(text);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;
    return 0;
  });
});

watch(matches, () => {
  selectedIndex.value = 0;
});

function openFinder(): void {
  if (open.value) return;
  open.value = true;
  query.value = "";
  keyboardStore.detach();
  nextTick(() => inputEl.value?.focus());
}

function closeFinder(): void {
  open.value = false;
  keyboardStore.attach();
}

function moveSelection(delta: number): void {
  const count = matches.value.length;
  if (count === 0) return;
  selectedIndex.value = (selectedIndex.value + delta + count) % count;
}

function submit(): void {
  const entry = matches.value[selectedIndex.value];
  if (!entry) {
    closeFinder();
    return;
  }
  const ptyId = terminalsStore.activeTab?.ptyId;
  if (ptyId) void invoke("pty_write", { id: ptyId, data: `'${entry.path}'` });
  closeFinder();
}

// Escape para cerrar es mecánica propia del modal, no una acción editable de
// shortcuts.json — se mantiene como listener directo. Abrir el buscador sí es la
// acción "FUZZY_SEARCH" (Ctrl+Shift+F por defecto), ahora despachada por el
// dispatcher genérico de useGlobalShortcuts.ts en vez de un atajo fijo acá.
function handleGlobalKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape" && open.value) {
    closeFinder();
  }
}

let unregister: (() => void) | null = null;

// captura=true: con la terminal enfocada, xterm.js corta la propagación del keydown
// en fase de burbuja antes de que llegue a window — este atajo debe verse desde antes.
onMounted(() => {
  window.addEventListener("keydown", handleGlobalKeydown, true);
  unregister = registerShortcutAction("FUZZY_SEARCH", openFinder);
});
onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleGlobalKeydown, true);
  unregister?.();
});
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fuzzy-overlay" @click.self="closeFinder">
      <div class="fuzzy-modal" data-augmented-ui="tr-clip bl-clip border">
        <input
          ref="inputEl"
          v-model="query"
          type="text"
          placeholder="Buscar en la carpeta actual…"
          @keydown.down.prevent="moveSelection(1)"
          @keydown.up.prevent="moveSelection(-1)"
          @keydown.enter.prevent="submit"
          @keydown.esc="closeFinder"
        />
        <ul class="fuzzy-results">
          <li v-if="query && matches.length === 0" class="fuzzy-empty">Sin resultados</li>
          <li
            v-for="(entry, i) in matches"
            :key="entry.path"
            :class="{ selected: i === selectedIndex }"
            @mouseenter="selectedIndex = i"
            @click="submit"
          >
            {{ entry.name }}
          </li>
        </ul>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.fuzzy-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 20vh;
  z-index: 200;
}
.fuzzy-modal {
  --aug-border-all: 0.18vh;
  --aug-border-bg: rgb(var(--color_r), var(--color_g), var(--color_b));
  background: var(--color_light_black);
  color: rgb(var(--color_r), var(--color_g), var(--color_b));
  width: 32vw;
  padding: 1vh;
  font-family: var(--font_main), sans-serif;
}
.fuzzy-modal input {
  width: 100%;
  box-sizing: border-box;
  background: transparent;
  border: 0.09vh solid rgba(var(--color_r), var(--color_g), var(--color_b), 0.5);
  color: inherit;
  font-family: var(--font_mono), monospace;
  font-size: calc(1vh * var(--ui-font-scale, 1));
  padding: 0.6vh;
  outline: none;
}
.fuzzy-modal input:focus {
  background: rgba(var(--color_r), var(--color_g), var(--color_b), 0.15);
}
.fuzzy-results {
  list-style: none;
  margin: 0.6vh 0 0;
  padding: 0;
  font-size: calc(0.95vh * var(--ui-font-scale, 1));
}
.fuzzy-results li {
  padding: 0.4vh 0.6vh;
  cursor: pointer;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.fuzzy-results li.selected {
  background: rgba(var(--color_r), var(--color_g), var(--color_b), 0.75);
  color: var(--color_black);
}
.fuzzy-empty {
  opacity: 0.5;
  cursor: default;
}
</style>
