<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { audioManager } from "@/core/audio/audioManager";
import { readSettings } from "@/core/persistence/settingsRepository";
import TerminalPanel from "@/features/terminal/components/TerminalPanel.vue";
import ClockPanel from "@/features/sysinfo/components/ClockPanel.vue";
import SysinfoPanel from "@/features/sysinfo/components/SysinfoPanel.vue";
import HardwareInspectorPanel from "@/features/sysinfo/components/HardwareInspectorPanel.vue";
import RamwatcherPanel from "@/features/sysinfo/components/RamwatcherPanel.vue";
import CpuinfoPanel from "@/features/sysinfo/components/CpuinfoPanel.vue";
import GpuPanel from "@/features/sysinfo/components/GpuPanel.vue";
import ToplistPanel from "@/features/sysinfo/components/ToplistPanel.vue";
import NetstatPanel from "@/features/sysinfo/components/NetstatPanel.vue";
import ConninfoPanel from "@/features/sysinfo/components/ConninfoPanel.vue";
import FilesystemPanel from "@/features/filesystem/components/FilesystemPanel.vue";
import KeyboardPanel from "@/features/keyboard/components/KeyboardPanel.vue";
import FuzzyFinderModal from "@/features/fuzzyFinder/components/FuzzyFinderModal.vue";
import { useSysinfoStore } from "@/features/sysinfo/stores/sysinfo.store";

const sysinfoStore = useSysinfoStore();

const shellStage = ref<"collapsed" | "grown" | "hidden" | "shown">("collapsed");
const titleVisible = ref(false);
const greeterVisible = ref(false);
const greeterMounted = ref(true);
const columnsActivated = ref(false);

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

onMounted(() => {
  playReveal();
});

onUnmounted(() => {
  document.body.setAttribute("class", "");
  sysinfoStore.stop();
});
</script>

<template>
  <section id="mod_column_left" class="mod_column" :class="{ activated: columnsActivated }">
    <h3 class="title">
      <p>PANEL</p>
      <p>SYSTEM</p>
    </h3>
    <ClockPanel />
    <SysinfoPanel />
    <HardwareInspectorPanel />
    <RamwatcherPanel />
  </section>

  <section
    id="main_shell"
    :class="{
      grown: shellStage === 'grown' || shellStage === 'hidden' || shellStage === 'shown',
      faded: shellStage === 'hidden',
    }"
  >
    <h3 class="title" :class="{ visible: titleVisible }">
      <p>TERMINAL</p>
      <p>MAIN SHELL</p>
    </h3>
    <div class="main_shell_inner" data-augmented-ui="bl-clip tr-clip border">
      <h1 v-if="greeterMounted" id="main_shell_greeting" :class="{ visible: greeterVisible }">
        Welcome back
      </h1>
      <TerminalPanel v-else />
    </div>
  </section>

  <section id="mod_column_right" class="mod_column" :class="{ activated: columnsActivated }">
    <h3 class="title">
      <p>PANEL</p>
      <p>NETWORK</p>
    </h3>
    <CpuinfoPanel />
    <GpuPanel />
    <ToplistPanel />
    <NetstatPanel />
    <ConninfoPanel />
  </section>

  <section id="filesystem"><FilesystemPanel /></section>
  <section id="keyboard"><KeyboardPanel /></section>
  <FuzzyFinderModal />
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
  font-size: 1.02vh;
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
  font-size: 3.9vh;
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
}

section#keyboard {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 55.5vw;
  position: relative;
  top: -0.925vh;
  opacity: 1;
}
</style>
