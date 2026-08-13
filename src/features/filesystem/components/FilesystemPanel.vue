<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { openPath } from "@tauri-apps/plugin-opener";
import FileEntry from "./FileEntry.vue";
import { useFilesystemStore } from "../stores/filesystem.store";
import { matchIcon } from "../fileIconsMatcher";
import { fileOpenKind, resolveMatchedIcon, specialIcon } from "../icons";
import { formatBytes } from "@/shared/utils/formatBytes";
import { readSettings, writeSettings } from "@/core/persistence/settingsRepository";
import { audioManager } from "@/core/audio/audioManager";
import { useDocReaderStore } from "@/features/docReader/stores/docReader.store";
import { useMediaPlayerStore } from "@/features/mediaPlayer/stores/mediaPlayer.store";
import {
  dispatchShortcutAction,
  registerShortcutAction,
} from "@/features/shortcuts/composables/useShortcutActions";
import type { FsEntry } from "../filesystemClient";

const { t } = useI18n();
const store = useFilesystemStore();
const docReaderStore = useDocReaderStore();
const mediaPlayerStore = useMediaPlayerStore();

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

// Antes esta función también escribía "cd <carpeta>" en la terminal real al navegar
// por el panel (y, en la otra dirección, un watch() acá reflejaba el cwd de la
// terminal en el panel). Ambos sentidos se sacaron a pedido del usuario: el panel y
// la terminal ahora navegan de forma completamente independiente, sin ensuciar la
// terminal con comandos que parecían tipeados solos ni saltar el panel de golpe.
async function enterDir(path: string): Promise<void> {
  audioManager.folder.play();
  await store.readFS(path);
}

async function activateEntry(entry: FsEntry): Promise<void> {
  if (entry.isDir) {
    await enterDir(entry.path);
    return;
  }
  // PDF/audio/video abren en un modal propio en vez de siempre delegar a la app del
  // sistema operativo (el único comportamiento que tenía el original) — todo lo demás
  // sigue cayendo a openPath() igual que antes.
  const kind = fileOpenKind(matchIcon(entry.name));
  if (kind === "pdf") {
    docReaderStore.open(entry.path);
    return;
  }
  if (kind === "audio" || kind === "video") {
    mediaPlayerStore.open(entry.path, kind);
    return;
  }
  await openPath(entry.path).catch(() => {});
}

async function goUp(): Promise<void> {
  if (!store.parent) return;
  audioManager.folder.play();
  await store.readFS(store.parent);
}

async function activateDrive(mountPoint: string): Promise<void> {
  audioManager.folder.play();
  await store.readFS(mountPoint);
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

// Acciones FS_LIST_VIEW/FS_DOTFILES de shortcuts.json (Ctrl+Shift+L/H por defecto) —
// registradas en el dispatcher genérico de useGlobalShortcuts.ts en vez de un listener
// propio fijo, para que reasignarlas o deshabilitarlas en ShortcutsModal surta efecto real.
let unregisterListView: (() => void) | null = null;
let unregisterDotfiles: (() => void) | null = null;
onMounted(() => {
  unregisterListView = registerShortcutAction("FS_LIST_VIEW", () => void onToggleListView());
  unregisterDotfiles = registerShortcutAction("FS_DOTFILES", () => void onToggleDotfiles());
});
onBeforeUnmount(() => {
  unregisterListView?.();
  unregisterDotfiles?.();
});
</script>

<template>
  <div class="filesystem-panel">
    <div class="fs-toolbar">
      <button
        type="button"
        :disabled="!store.parent || store.showingDrives"
        :title="t('panels.filesystem.goUp')"
        @click="goUp"
      >
        ↑
      </button>
      <span class="fs-path" :title="store.path">{{
        store.showingDrives ? t("panels.filesystem.drives") : shortPath
      }}</span>
      <button type="button" :title="t('panels.filesystem.showDrives')" @click="store.showDrives">
        💾
      </button>
      <button
        type="button"
        :class="{ 'fs-toggle-active': store.listView }"
        :title="t('panels.filesystem.toggleView')"
        @click="onToggleListView"
      >
        ☰
      </button>
      <button
        type="button"
        :class="{ 'fs-toggle-active': store.hideDotfiles }"
        :title="t('panels.filesystem.toggleDotfiles')"
        @click="onToggleDotfiles"
      >
        •
      </button>
      <span class="fs-toolbar-spacer"></span>
      <button
        type="button"
        :title="t('appShell.openSettings')"
        @click="dispatchShortcutAction('SETTINGS')"
      >
        ⚙
      </button>
      <button
        type="button"
        :title="t('appShell.openShortcuts')"
        @click="dispatchShortcutAction('SHORTCUTS')"
      >
        ⌨
      </button>
      <button
        type="button"
        class="fs-quit-btn"
        :title="t('appShell.quit')"
        @click="dispatchShortcutAction('QUIT')"
      >
        ⏻
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
          :title="t('panels.filesystem.driveFree', { free: formatBytes(drive.available), total: formatBytes(drive.total) })"
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
        <div v-if="store.failed" class="fs-empty">{{ t("panels.filesystem.readError") }}</div>
        <div v-else-if="store.loading" class="fs-loading">{{ t("panels.filesystem.loading") }}</div>
        <div v-else-if="store.visibleEntries.length === 0" class="fs-empty">
          {{ t("panels.filesystem.empty") }}
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
  font-size: calc(1vh * var(--ui-font-scale, 1));
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
/* Rojo universal al pasar el mouse (no el acento del tema) — misma lógica que los
   íconos de error/warning de ModalHost.vue: es una acción destructiva/de salida, se
   quiere que se lea como tal sin importar qué tema esté activo. */
.fs-quit-btn:hover {
  border-color: #ff5f5f;
  color: #ff5f5f;
}
.fs-toolbar-spacer {
  flex: 1;
}
.fs-path {
  flex: 1;
  font-size: calc(0.95vh * var(--ui-font-scale, 1));
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
  gap: 0.2vh;
}
/* Scrollbar propia con los colores del tema — sin esto se veía la barra gris nativa
   de Windows/Chromium, la única del panel que no seguía el tema (mismo tratamiento
   que ya usan PanelBox/BaseModal). */
.fs-body::-webkit-scrollbar {
  width: 0.7vh;
}
.fs-body::-webkit-scrollbar-track {
  background: rgba(var(--color_r), var(--color_g), var(--color_b), 0.08);
}
.fs-body::-webkit-scrollbar-thumb {
  background: rgba(var(--color_r), var(--color_g), var(--color_b), 0.4);
}
.fs-body::-webkit-scrollbar-thumb:hover {
  background: rgba(var(--color_r), var(--color_g), var(--color_b), 0.65);
}

.fs-empty {
  grid-column: 1 / -1;
  opacity: 0.5;
  font-size: calc(0.9vh * var(--ui-font-scale, 1));
  padding: 1vh 0;
  text-align: center;
}

/* Antes, mientras se leía una carpeta (fs_list_dir en vuelo) sin resultados todavía, no
   se mostraba nada — reemplaza al "space_bar_working" del original (indicador animado
   de "procesando" en el explorador de archivos). */
.fs-loading {
  grid-column: 1 / -1;
  opacity: 0.5;
  font-size: calc(0.9vh * var(--ui-font-scale, 1));
  padding: 1vh 0;
  text-align: center;
  animation: fs-loading-pulse 1.2s ease-in-out infinite;
}
@keyframes fs-loading-pulse {
  0%,
  100% {
    opacity: 0.3;
  }
  50% {
    opacity: 0.75;
  }
}
</style>
