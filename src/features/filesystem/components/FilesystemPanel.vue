<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { openPath } from "@tauri-apps/plugin-opener";
import FileEntry from "./FileEntry.vue";
import { useFilesystemStore } from "../stores/filesystem.store";
import { useTerminalsStore } from "@/features/terminal/stores/terminals.store";
import { matchIcon } from "../fileIconsMatcher";
import { resolveMatchedIcon, specialIcon } from "../icons";
import { formatBytes } from "@/shared/utils/formatBytes";
import { readSettings, writeSettings } from "@/core/persistence/settingsRepository";
import { audioManager } from "@/core/audio/audioManager";
import type { FsEntry } from "../filesystemClient";

const store = useFilesystemStore();
const terminalsStore = useTerminalsStore();

function iconFor(entry: FsEntry) {
  if (entry.isSymlink) return specialIcon("symlink");
  if (entry.isDir) return specialIcon("dir");
  return resolveMatchedIcon(matchIcon(entry.name));
}

function dateLabel(entry: FsEntry): string {
  if (entry.modifiedMs === null) return "";
  return new Date(entry.modifiedMs).toLocaleDateString();
}

function sizeLabel(entry: FsEntry): string {
  return entry.isDir ? "" : formatBytes(entry.size);
}

function writeToActiveTerminal(data: string): void {
  const ptyId = terminalsStore.activeTab?.ptyId;
  if (ptyId) void invoke("pty_write", { id: ptyId, data });
}

async function enterDir(path: string, dirName: string): Promise<void> {
  audioManager.folder.play();
  await store.readFS(path);
  writeToActiveTerminal(`cd "${dirName}"\r\n`);
}

async function activateEntry(entry: FsEntry): Promise<void> {
  if (entry.isDir) {
    await enterDir(entry.path, entry.name);
    return;
  }
  await openPath(entry.path).catch(() => {});
}

async function goUp(): Promise<void> {
  if (!store.parent) return;
  audioManager.folder.play();
  await store.readFS(store.parent);
  writeToActiveTerminal("cd ..\r\n");
}

async function activateDrive(mountPoint: string): Promise<void> {
  audioManager.folder.play();
  await store.readFS(mountPoint);
  writeToActiveTerminal(`cd "${mountPoint}"\r\n`);
}

async function onToggleListView(): Promise<void> {
  store.toggleListView();
  const settings = await readSettings().catch(() => null);
  if (settings) await writeSettings({ ...settings, fsListView: store.listView }).catch(() => {});
}

async function onToggleDotfiles(): Promise<void> {
  store.toggleHideDotfiles();
  const settings = await readSettings().catch(() => null);
  if (settings)
    await writeSettings({ ...settings, hideDotfiles: store.hideDotfiles }).catch(() => {});
}

const shortPath = computed(() => {
  const p = store.path;
  return p.length > 48 ? `…${p.slice(-47)}` : p;
});

onMounted(async () => {
  const settings = await readSettings().catch(() => null);
  if (settings) {
    store.listView = settings.fsListView;
    store.hideDotfiles = settings.hideDotfiles;
  }
  await store.initAtHome();
});

// Sincronización con la terminal activa: a diferencia del original (que en Windows
// nunca pudo trackear el cwd real del shell y quedaba siempre en modo "detached"), acá
// sysinfo::Process::cwd() sí funciona en Windows — cuando cambia el cwd reportado por
// la pestaña activa, el panel se re-sincroniza automáticamente.
watch(
  () => terminalsStore.activeTab?.cwd,
  (cwd) => {
    if (cwd && cwd !== store.path && !store.showingDrives) void store.readFS(cwd);
  },
);

// Atajos por defecto de shortcuts.json (Ctrl+Shift+L / Ctrl+Shift+H) — mismo patrón
// de listener local ya usado en TerminalPanel para su propio buscador (Ctrl+F), en vez
// de depender del dispatcher genérico de atajos (todavía no existe como feature).
function handleGlobalKeydown(event: KeyboardEvent): void {
  if (!event.ctrlKey || !event.shiftKey) return;
  if (event.key.toLowerCase() === "l") {
    event.preventDefault();
    void onToggleListView();
  } else if (event.key.toLowerCase() === "h") {
    event.preventDefault();
    void onToggleDotfiles();
  }
}

// captura=true: con la terminal enfocada, xterm.js corta la propagación del keydown
// en fase de burbuja antes de que llegue a window — este atajo debe verse desde antes.
onMounted(() => window.addEventListener("keydown", handleGlobalKeydown, true));
onBeforeUnmount(() => window.removeEventListener("keydown", handleGlobalKeydown, true));
</script>

<template>
  <div class="filesystem-panel">
    <div class="fs-toolbar">
      <button
        type="button"
        :disabled="!store.parent || store.showingDrives"
        title="Subir a la carpeta contenedora"
        @click="goUp"
      >
        ↑
      </button>
      <span class="fs-path" :title="store.path">{{
        store.showingDrives ? "Unidades" : shortPath
      }}</span>
      <button type="button" title="Ver todas las unidades de disco" @click="store.showDrives">
        💾
      </button>
      <button
        type="button"
        :class="{ 'fs-toggle-active': store.listView }"
        title="Alternar entre vista de íconos y vista de lista"
        @click="onToggleListView"
      >
        ☰
      </button>
      <button
        type="button"
        :class="{ 'fs-toggle-active': store.hideDotfiles }"
        title="Mostrar u ocultar archivos que empiezan con un punto (ocultos por convención en Unix)"
        @click="onToggleDotfiles"
      >
        •
      </button>
    </div>

    <div class="fs-body" :class="{ 'list-view': store.listView }">
      <template v-if="store.showingDrives">
        <FileEntry
          v-for="drive in store.drives"
          :key="drive.mountPoint"
          :name="drive.name"
          :icon="specialIcon(drive.isRemovable ? 'usb' : 'disk')"
          :list-view="store.listView"
          :title="`${formatBytes(drive.available)} libres de ${formatBytes(drive.total)}`"
          @activate="activateDrive(drive.mountPoint)"
        />
      </template>
      <template v-else>
        <FileEntry
          v-for="entry in store.visibleEntries"
          :key="entry.path"
          :name="entry.name"
          :icon="iconFor(entry)"
          :list-view="store.listView"
          :hidden="entry.hidden"
          :size-label="sizeLabel(entry)"
          :date-label="dateLabel(entry)"
          @activate="activateEntry(entry)"
        />
        <div v-if="store.failed" class="fs-empty">No se pudo leer esta carpeta</div>
        <div v-else-if="store.visibleEntries.length === 0 && !store.loading" class="fs-empty">
          Carpeta vacía
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.filesystem-panel {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  font-family: var(--font_main), sans-serif;
}

.fs-toolbar {
  display: flex;
  align-items: center;
  gap: 0.4vh;
  padding-bottom: 0.4vh;
  border-bottom: 0.09vh solid rgba(var(--color_r), var(--color_g), var(--color_b), 0.3);
  margin-bottom: 0.4vh;
}
.fs-toolbar button {
  background: none;
  border: 0.09vh solid rgba(var(--color_r), var(--color_g), var(--color_b), 0.4);
  color: rgb(var(--color_r), var(--color_g), var(--color_b));
  cursor: pointer;
  font-size: 1vh;
  padding: 0.2vh 0.5vh;
  line-height: 1.4;
}
.fs-toolbar button:disabled {
  opacity: 0.3;
  cursor: default;
}
.fs-toolbar button.fs-toggle-active {
  background: rgb(var(--color_r), var(--color_g), var(--color_b));
  color: var(--color_black);
}
.fs-path {
  flex: 1;
  font-size: 0.95vh;
  opacity: 0.75;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  direction: rtl;
  text-align: left;
}

.fs-body {
  flex: 1;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(8.5vh, 1fr));
  grid-auto-rows: 8.5vh;
  gap: 0.5vh;
  align-content: start;
}
.fs-body.list-view {
  display: flex;
  flex-direction: column;
  gap: 0.1vh;
}

.fs-empty {
  grid-column: 1 / -1;
  opacity: 0.5;
  font-size: 0.9vh;
  padding: 1vh 0;
  text-align: center;
}
</style>
