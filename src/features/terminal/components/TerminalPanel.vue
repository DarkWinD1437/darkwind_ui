<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useTerminalsStore } from "../stores/terminals.store";
import TerminalInstance from "./TerminalInstance.vue";
import { audioManager } from "@/core/audio/audioManager";
import { registerShortcutAction } from "@/features/shortcuts/composables/useShortcutActions";

const store = useTerminalsStore();
const searchOpen = ref(false);
const searchQuery = ref("");
const searchInput = ref<HTMLInputElement | null>(null);

type TerminalInstanceExposed = InstanceType<typeof TerminalInstance>;
const instanceRefs = new Map<string, TerminalInstanceExposed>();

function setInstanceRef(key: string, el: TerminalInstanceExposed | null): void {
  if (el) instanceRefs.set(key, el);
  else instanceRefs.delete(key);
}

function activateTab(key: string): void {
  audioManager.folder.play();
  store.setActive(key);
  instanceRefs.get(key)?.focus();
}

function addTab(): void {
  const key = store.openTab();
  if (key) audioManager.expand.play();
}

function closeTab(key: string): void {
  if (store.tabs.length <= 1) return;
  store.closeTab(key);
  if (store.activeKey) instanceRefs.get(store.activeKey)?.focus();
}

function focusRelativeTab(direction: 1 | -1): void {
  if (store.tabs.length <= 1) return;
  const index = store.tabs.findIndex((tab) => tab.key === store.activeKey);
  if (index === -1) return;
  const nextIndex = (index + direction + store.tabs.length) % store.tabs.length;
  activateTab(store.tabs[nextIndex].key);
}

function openSearch(): void {
  searchOpen.value = true;
  requestAnimationFrame(() => searchInput.value?.focus());
}

function closeSearch(): void {
  searchOpen.value = false;
  searchQuery.value = "";
  if (store.activeKey) instanceRefs.get(store.activeKey)?.focus();
}

function runSearch(direction: "next" | "previous"): void {
  if (!store.activeKey || !searchQuery.value) return;
  const instance = instanceRefs.get(store.activeKey);
  if (direction === "next") instance?.findNext(searchQuery.value);
  else instance?.findPrevious(searchQuery.value);
}

function handleKeydown(event: KeyboardEvent): void {
  // Sin el chequeo de "!shiftKey", Ctrl+Shift+F (atajo del buscador difuso de
  // archivos) también abría este buscador de scrollback al mismo tiempo, porque
  // Ctrl+Shift+F cumple igual la condición "ctrlKey && key === 'f'".
  if (event.ctrlKey && !event.shiftKey && event.key.toLowerCase() === "f") {
    event.preventDefault();
    openSearch();
  } else if (event.key === "Escape" && searchOpen.value) {
    closeSearch();
  }
}

let unregisterCopy: (() => void) | null = null;
let unregisterPaste: (() => void) | null = null;
let unregisterNextTab: (() => void) | null = null;
let unregisterPrevTab: (() => void) | null = null;
let unregisterTabClose: (() => void) | null = null;

onMounted(() => {
  if (store.tabs.length === 0) store.openTab();
  // captura=true: xterm.js corta la propagación de este evento en fase de burbuja
  // sobre su <textarea> interno — con la terminal enfocada (el caso más común, ya que
  // este mismo atajo busca en SU scrollback), un listener en window sin captura nunca
  // vería a Ctrl+F.
  window.addEventListener("keydown", handleKeydown, true);

  unregisterCopy = registerShortcutAction("COPY", () => {
    if (store.activeKey) void instanceRefs.get(store.activeKey)?.copySelection();
  });
  unregisterPaste = registerShortcutAction("PASTE", () => {
    if (store.activeKey) void instanceRefs.get(store.activeKey)?.pasteFromClipboard();
  });
  unregisterNextTab = registerShortcutAction("NEXT_TAB", () => focusRelativeTab(1));
  unregisterPrevTab = registerShortcutAction("PREVIOUS_TAB", () => focusRelativeTab(-1));
  unregisterTabClose = registerShortcutAction("TAB_X", () => {
    if (store.activeKey) closeTab(store.activeKey);
  });
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleKeydown, true);
  unregisterCopy?.();
  unregisterPaste?.();
  unregisterNextTab?.();
  unregisterPrevTab?.();
  unregisterTabClose?.();
});
</script>

<template>
  <div class="terminal-panel">
    <ul class="terminal-tabs">
      <li
        v-for="tab in store.tabs"
        :key="tab.key"
        :class="{ active: tab.key === store.activeKey }"
        @click="activateTab(tab.key)"
      >
        <p>{{ tab.label }}</p>
        <button
          v-if="store.tabs.length > 1"
          class="terminal-tab-close"
          type="button"
          @click.stop="closeTab(tab.key)"
        >
          ✕
        </button>
      </li>
      <li v-if="store.canOpenTab" class="terminal-tab-add" @click="addTab">
        <p>+</p>
      </li>
    </ul>

    <div class="terminal-instances">
      <TerminalInstance
        v-for="tab in store.tabs"
        :key="tab.key"
        :ref="(el) => setInstanceRef(tab.key, el as TerminalInstanceExposed | null)"
        :tab-key="tab.key"
        :active="tab.key === store.activeKey"
      />
    </div>

    <div v-if="store.activeTab" class="terminal-cwd">{{ store.activeTab.cwd }}</div>

    <div v-if="searchOpen" class="terminal-search">
      <input
        ref="searchInput"
        v-model="searchQuery"
        type="text"
        placeholder="Buscar en el scrollback..."
        @keydown.enter.exact="runSearch('next')"
        @keydown.shift.enter="runSearch('previous')"
        @keydown.esc="closeSearch"
      />
      <button type="button" @click="runSearch('previous')">↑</button>
      <button type="button" @click="runSearch('next')">↓</button>
      <button type="button" @click="closeSearch">✕</button>
    </div>
  </div>
</template>

<style scoped>
.terminal-panel {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
}

ul.terminal-tabs {
  margin: 0;
  margin-top: -0.7vh;
  margin-left: -0.74vh;
  padding: 0;
  width: calc(100% + 1.48vh);
  display: flex;
  box-sizing: border-box;
  border-bottom: 0.18vh solid rgba(var(--color_r), var(--color_g), var(--color_b), 0.5);
  border-top-left-radius: 0.278vh;
  border-top-right-radius: 0.278vh;
  flex-direction: row;
  align-items: center;
  justify-content: space-evenly;
  flex-wrap: nowrap;
  overflow: hidden;
}

ul.terminal-tabs > li {
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4vh;
  font-family: var(--font_main);
  font-weight: normal;
  /* Ancho fijo (no width:100%) para que la pestaña activa, agrandada con scale(1.2)
     más abajo, no se estire lo suficiente como para tapar al botón "+" vecino cuando
     hay pocas pestañas abiertas. */
  flex: 0 1 20%;
  padding-top: 0.7vh;
  padding-bottom: 0.4vh;
  text-align: center;
  box-sizing: border-box;
  background: var(--color_light_black);
  transform: skewX(35deg);
}
ul.terminal-tabs > li > p {
  margin: 0;
  transform: skewX(-35deg);
}
ul.terminal-tabs > li:not(:first-child) {
  border-left: 0.18vh solid rgba(var(--color_r), var(--color_g), var(--color_b), 0.5);
}
ul.terminal-tabs > li.active {
  background: rgb(var(--color_r), var(--color_g), var(--color_b));
  color: var(--color_light_black);
  font-weight: bold;
  transform: skewX(35deg) scale(1.2);
  z-index: 1;
}
ul.terminal-tabs > li.terminal-tab-add {
  flex: 0 0 auto;
  width: auto;
  padding-left: 1vh;
  padding-right: 1vh;
}

.terminal-tab-close {
  transform: skewX(-35deg);
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 0.9em;
  padding: 0;
  line-height: 1;
}

.terminal-instances {
  position: relative;
  flex: 1;
  overflow: hidden;
}

.terminal-cwd {
  font-size: 0.9vh;
  opacity: 0.6;
  padding: 0.2vh 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.terminal-search {
  position: absolute;
  top: 0.5vh;
  right: 0.5vh;
  display: flex;
  align-items: center;
  gap: 0.3vh;
  background: var(--color_light_black);
  border: 0.09vh solid rgba(var(--color_r), var(--color_g), var(--color_b), 0.5);
  padding: 0.3vh;
  z-index: 10;
}
.terminal-search input {
  background: transparent;
  border: none;
  color: rgb(var(--color_r), var(--color_g), var(--color_b));
  font-family: var(--font_mono, monospace);
  outline: none;
}
.terminal-search button {
  background: none;
  border: none;
  color: rgb(var(--color_r), var(--color_g), var(--color_b));
  cursor: pointer;
}
</style>
