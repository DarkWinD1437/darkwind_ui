<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { audioManager } from "@/core/audio/audioManager";
import { readSettings } from "@/core/persistence/settingsRepository";
import { useSettingsStore } from "@/features/settings/stores/settings.store";
import { useTerminalsStore } from "@/features/terminal/stores/terminals.store";
import TerminalPanel from "@/features/terminal/components/TerminalPanel.vue";
import ClockPanel from "@/features/sysinfo/components/ClockPanel.vue";
import SysinfoPanel from "@/features/sysinfo/components/SysinfoPanel.vue";
import HardwareInspectorPanel from "@/features/sysinfo/components/HardwareInspectorPanel.vue";
import CpuinfoPanel from "@/features/sysinfo/components/CpuinfoPanel.vue";
import GpuPanel from "@/features/sysinfo/components/GpuPanel.vue";
import ToplistPanel from "@/features/sysinfo/components/ToplistPanel.vue";
import NetstatPanel from "@/features/sysinfo/components/NetstatPanel.vue";
import GlobePanel from "@/features/globe/components/GlobePanel.vue";
import ConninfoPanel from "@/features/sysinfo/components/ConninfoPanel.vue";
import FilesystemPanel from "@/features/filesystem/components/FilesystemPanel.vue";
import KeyboardPanel from "@/features/keyboard/components/KeyboardPanel.vue";
import FuzzyFinderModal from "@/features/fuzzyFinder/components/FuzzyFinderModal.vue";
import ModalHost from "@/features/modals/components/ModalHost.vue";
import SettingsModal from "@/features/settings/components/SettingsModal.vue";
import ShortcutsModal from "@/features/shortcuts/components/ShortcutsModal.vue";
import DocReaderModal from "@/features/docReader/components/DocReaderModal.vue";
import MediaPlayerModal from "@/features/mediaPlayer/components/MediaPlayerModal.vue";
import { useGlobalShortcuts } from "@/features/shortcuts/composables/useGlobalShortcuts";
import { registerShortcutAction } from "@/features/shortcuts/composables/useShortcutActions";
import { useSysinfoStore } from "@/features/sysinfo/stores/sysinfo.store";
import UpdateBanner from "@/features/update/components/UpdateBanner.vue";
import ShutdownOverlay from "./ShutdownOverlay.vue";

const { t } = useI18n();
const sysinfoStore = useSysinfoStore();
const terminalsStore = useTerminalsStore();
const settingsStore = useSettingsStore();
useGlobalShortcuts();

// Settings ya está cargado por App.vue antes de montar AppShell (ver onMounted de
// App.vue) — se lee reactivo acá para que tildar/destildar "Mostrar teclado virtual"
// en SettingsModal reorganice el layout al toque, sin reiniciar la app.
const showVirtualKeyboard = computed(() => settingsStore.current?.virtualKeyboard ?? true);

const shellStage = ref<"collapsed" | "grown" | "hidden" | "shown">("collapsed");
const titleVisible = ref(false);
const greeterVisible = ref(false);
const greeterMounted = ref(true);
const columnsActivated = ref(false);
const isClosing = ref(false);

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function playReveal(): Promise<void> {
  await delay(10);

  audioManager.expand.play();
  shellStage.value = "grown";

  await delay(500);

  titleVisible.value = true;

  await delay(700);

  shellStage.value = "hidden";

  await delay(10);

  shellStage.value = "shown";

  await delay(270);

  greeterVisible.value = true;

  await delay(1100);

  greeterVisible.value = false;

  await delay(500);

  greeterMounted.value = false;

  const settings = await readSettings().catch(() => null);
  sysinfoStore.start(settings?.pingAddr);

  // Loop escalonado que reproduce el timing de revelado del original panel por panel,
  // en vez de que las 8 columnas aparezcan todas a la vez.
  columnsActivated.value = true;
  const left = document.querySelectorAll("#mod_column_left > div");
  const right = document.querySelectorAll("#mod_column_right > div");
  let i = 0;
  const interval = setInterval(() => {
    if (!left[i] && !right[i]) {
      clearInterval(interval);
      return;
    }
    audioManager.panels.play();
    (left[i] as HTMLElement | undefined)?.style.setProperty("animation-play-state", "running");
    (right[i] as HTMLElement | undefined)?.style.setProperty("animation-play-state", "running");
    i++;
  }, 500);
}

// El original cierra con app.quit()/electron.remote.app.quit() directo, sin ningún
// paso visual (Sección 15 #13 / 19.13 del plan) — pieza enteramente nueva acá.
// getCurrentWindow().onCloseRequested() intercepta el cierre (click en la X, Alt+F4)
// ANTES de que la ventana desaparezca, deja correr la animación de salida (reverso del
// fade-in de columnas + overlay con "Cerrando sesión...") y solo entonces destruye la
// ventana de verdad — destroy() no vuelve a disparar onCloseRequested (a diferencia de
// close()), así que no hace falta protegerse de un loop.
let closeUnlisten: (() => void) | null = null;

async function killAllTerminals(): Promise<void> {
  await Promise.all(
    terminalsStore.tabs
      .filter((tab) => tab.ptyId)
      .map((tab) => invoke("pty_kill", { id: tab.ptyId }).catch(() => {})),
  );
}

async function beginShutdown(): Promise<void> {
  // Guarda contra el usuario insistiendo en cerrar (doble click en la X, etc.)
  // mientras la animación todavía está corriendo.
  if (isClosing.value) return;
  isClosing.value = true;
  // El sonido y el timing de la coreografía completa (glitch del branding + log de
  // cierre, ~5.9s, Sección 19.22 del plan) los maneja ShutdownOverlay.vue — acá solo se
  // espera lo suficiente para que termine de correr antes de destruir la ventana de
  // verdad.
  await Promise.all([killAllTerminals(), delay(6000)]);
  closeUnlisten?.();
  await getCurrentWindow().destroy();
}

onMounted(() => {
  playReveal();
});

// Botón/atajo de salir (⏻ en el explorador de archivos, Ctrl+Shift+Q) — en pantalla
// completa forzada no hay barra de título ni "X" nativa del SO para cerrar, así que
// sin esto la única forma de salir quedaba en Alt+F4 (funciona igual, pero no es
// descubrible). Dispara la MISMA secuencia que cerrar la ventana de verdad.
let unregisterQuit: (() => void) | null = null;
onMounted(() => {
  unregisterQuit = registerShortcutAction("QUIT", () => void beginShutdown());
});

onMounted(async () => {
  // getCurrentWindow() lanza SINCRÓNICAMENTE si window.__TAURI_INTERNALS__.metadata no
  // existe (mismo caso que useViewportUnits.ts en App.vue) — acá ese throw se
  // convierte solo en el rechazo de ESTA función async, así que alcanza con un
  // try/catch a su alrededor para no dejar una promesa sin atrapar.
  try {
    closeUnlisten = await getCurrentWindow().onCloseRequested(async (event) => {
      event.preventDefault();
      await beginShutdown();
    });
  } catch {
    // Sin ventana real detrás (ej. arnés de tests) no hay cierre nativo que
    // interceptar — no bloquea el resto del arranque de AppShell.
  }
});

onUnmounted(() => {
  document.body.setAttribute("class", "");
  sysinfoStore.stop();
  closeUnlisten?.();
  unregisterQuit?.();
});
</script>

<template>
  <section
    id="mod_column_left"
    class="mod_column"
    :class="{ activated: columnsActivated, closing: isClosing }"
  >
    <h3 class="title">
      <p>{{ t("appShell.panelSystem1") }}</p>
      <p>{{ t("appShell.panelSystem2") }}</p>
    </h3>
    <ClockPanel />
    <SysinfoPanel />
    <HardwareInspectorPanel />
    <CpuinfoPanel />
    <GpuPanel />
  </section>

  <section
    id="main_shell"
    :class="{
      grown: shellStage === 'grown' || shellStage === 'hidden' || shellStage === 'shown',
      faded: shellStage === 'hidden',
      closing: isClosing,
    }"
  >
    <h3 class="title" :class="{ visible: titleVisible }">
      <p>{{ t("appShell.terminal1") }}</p>
      <p>{{ t("appShell.terminal2") }}</p>
    </h3>
    <div class="main_shell_inner" data-augmented-ui="bl-clip tr-clip border">
      <h1 v-if="greeterMounted" id="main_shell_greeting" :class="{ visible: greeterVisible }">
        {{ t("appShell.welcomeBack") }}
      </h1>
      <TerminalPanel v-else />
    </div>
  </section>

  <section
    id="mod_column_right"
    class="mod_column"
    :class="{ activated: columnsActivated, closing: isClosing }"
  >
    <h3 class="title">
      <p>{{ t("appShell.panelNetwork1") }}</p>
      <p>{{ t("appShell.panelNetwork2") }}</p>
    </h3>
    <ToplistPanel />
    <NetstatPanel />
    <GlobePanel />
    <ConninfoPanel />
  </section>

  <section
    id="filesystem"
    :class="{ closing: isClosing, 'no-keyboard': !showVirtualKeyboard }"
  >
    <FilesystemPanel />
  </section>
  <section v-if="showVirtualKeyboard" id="keyboard" :class="{ closing: isClosing }">
    <KeyboardPanel />
  </section>
  <FuzzyFinderModal />
  <ModalHost />
  <SettingsModal />
  <ShortcutsModal />
  <DocReaderModal />
  <MediaPlayerModal />
  <UpdateBanner v-if="!isClosing" />
  <ShutdownOverlay v-if="isClosing" />
</template>

<style>
html,
body {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

body {
  user-select: none !important;
  padding-top: 1.85vh;
  color: rgb(var(--color_r), var(--color_g), var(--color_b));
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  background:
    linear-gradient(90deg, var(--color_light_black) 1.85vh, transparent 1%) center,
    linear-gradient(var(--color_light_black) 1.85vh, transparent 1%) center,
    var(--color_grey);
  background-size: 2.04vh 2.04vh;
}

section > h3.title:first-child {
  position: fixed;
  margin: 0;
  padding: 0 0.925vh;
  font-size: calc(1.02vh * var(--ui-font-scale, 1));
  border-bottom: 0.092vh solid rgba(var(--color_r), var(--color_g), var(--color_b), 0.3);
}
section > h3.title:first-child > p {
  display: inline-block;
  margin: 0;
  width: 49.4%;
}
section > h3.title:first-child > p:last-child {
  text-align: right;
  white-space: nowrap;
}
</style>

<style scoped>
section.mod_column {
  width: 17%;
  top: 2.5vh;
  min-height: 10%;
  max-height: 96%;
  padding: 1.39vh;
  padding-bottom: 0;
  box-sizing: border-box;
  position: absolute;
  display: flex;
  flex-direction: column;
  justify-content: space-between;

  opacity: 0;
  transition: opacity 0.5s cubic-bezier(0.4, 0, 1, 1);
}

section.mod_column.activated {
  opacity: 1;
}

section.mod_column > h3.title {
  top: 0.74vh;
  width: 14.8%;
}

section.mod_column > :deep(div) {
  width: 100%;
  opacity: 0;
  animation-name: fadeIn;
  animation-duration: 0.5s;
  animation-timing-function: cubic-bezier(0.4, 0, 1, 1);
  animation-iteration-count: 1;
  animation-fill-mode: forwards;
  animation-play-state: paused;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

#mod_column_left {
  left: -0.555vh;
  align-items: flex-end;
}
#mod_column_left > h3.title {
  left: 0.555vh;
}

#mod_column_right {
  right: -0.555vh;
  align-items: flex-start;
}
#mod_column_right > h3.title {
  right: 0.555vh;
}

#main_shell {
  width: 0%;
  height: 0%;

  transition:
    width 0.5s cubic-bezier(0.85, 0.5, 0.85, 0.5),
    height 0.5s cubic-bezier(0.85, 0.5, 0.85, 0.5),
    opacity 0.5s cubic-bezier(0.4, 0, 1, 1);
}

#main_shell.grown {
  width: 65%;
  height: 60.3%;
}

#main_shell.faded {
  opacity: 0;
}

/* Separado de #main_shell para que sus esquinas recortadas (data-augmented-ui) no
   recorten la barra de título position:fixed, que debe quedar pegada al viewport
   durante la animación de crecimiento en vez de escalar junto con esta caja. */
.main_shell_inner {
  width: 100%;
  height: 100%;
  padding: 0.74vh;
  box-sizing: border-box;

  --aug-border-all: 0.18vh;
  --aug-border-bg: rgb(var(--color_r), var(--color_g), var(--color_b));
  --aug-border-opacity: 0.5;

  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  overflow: hidden;
}

#main_shell > h3.title {
  top: 0.74vh;
  left: 16.5vw;
  width: 66%;
  opacity: 0;
  transition: opacity 0.5s cubic-bezier(0.4, 0, 1, 1) 0.5s;
}
#main_shell > h3.title.visible {
  opacity: 1;
}
#main_shell > h3.title > p {
  width: 49.8%;
}

h1#main_shell_greeting {
  font-size: calc(3.9vh * var(--ui-font-scale, 1));
  font-weight: normal;
  margin: auto;
  opacity: 0;
  transition: opacity 0.5s cubic-bezier(0.4, 0, 1, 1);
}
h1#main_shell_greeting.visible {
  opacity: 1;
}

section#filesystem {
  position: relative;
  top: -0.925vh;
  width: 43vw;
  height: 30vh;
  margin-right: 0.5vw;
  opacity: 1;
  transition:
    opacity 0.5s cubic-bezier(0.4, 0, 1, 1),
    width 0.4s cubic-bezier(0.4, 0, 1, 1);
}

/* Sin teclado virtual, FilesystemPanel absorbe el ancho combinado que antes se
   repartía con #keyboard (43vw + 0.5vw de margen + 55.5vw ≈ 99vw) — su grilla ya usa
   `repeat(auto-fill, minmax(8.5vh, 1fr))` (FilesystemPanel.vue), así que gana columnas
   de íconos solo, sin tocar nada del resto de la grilla de AppShell. */
section#filesystem.no-keyboard {
  width: 90vw;
  margin-right: 0;
}

section#keyboard {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 55.5vw;
  position: relative;
  top: -0.925vh;
  opacity: 1;
  transition: opacity 0.5s cubic-bezier(0.4, 0, 1, 1);
}

/* Animación de cierre (Sección 15 #13 del plan) — reverso del fade-in de arranque de
   arriba: reusa la MISMA transición de opacity que cada sección ya tenía (columnas,
   main_shell, filesystem, keyboard) en vez de definir una nueva. */
.closing {
  opacity: 0 !important;
}
</style>
