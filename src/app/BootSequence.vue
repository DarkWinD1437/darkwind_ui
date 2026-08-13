<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import bootLogRaw from "@/assets/misc/boot_log.txt?raw";
import { audioManager } from "@/core/audio/audioManager";

const emit = defineEmits<{ complete: [] }>();

const lines = ref<string[]>([]);
const showingLog = ref(true);
const centered = ref(false);
const bodySolid = ref(false);
const titleStage = ref<"hidden" | "text" | "filled" | "bordered" | "clear">("hidden");
const glitching = ref(false);

const ENTITY_MAP: Record<string, string> = {
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#039;": "'",
  "&amp;": "&",
};

function decodeEntities(line: string): string {
  return line.replace(/&lt;|&gt;|&quot;|&#039;|&amp;/g, (m) => ENTITY_MAP[m]);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitAfterLine(n: number, total: number): number {
  if (n === 2) return 500;
  if (n === 4) return 500;
  if (n > 4 && n < 25) return 30;
  if (n === 25) return 400;
  if (n === 42) return 300;
  if (n > 42 && n < 82) return 25;
  if (n === 83) return 25;
  if (n >= total - 2 && n < total) return 300;
  return Math.pow(1 - n / 1000, 3) * 25;
}

async function runBootLog(): Promise<void> {
  const log = bootLogRaw.split("\n");

  for (let i = 0; i < log.length; i++) {
    const line = log[i];
    if (line === "Boot Complete") {
      audioManager.granted.play();
    } else {
      audioManager.stdout.play();
    }
    lines.value.push(decodeEntities(line));

    const n = i + 1;
    if (n === 2) {
      lines.value.push(
        `DarkWinD_UI Kernel version 0.1.0 boot at ${new Date().toString()}; root:xnu-1699.22.73~1/RELEASE_X86_64`,
      );
    }

    await delay(waitAfterLine(n, log.length));
  }

  await delay(300);
  await runTitleScreen();
}

async function runTitleScreen(): Promise<void> {
  showingLog.value = false;
  lines.value = [];
  audioManager.theme.play();

  await delay(400);

  centered.value = true;
  titleStage.value = "text";

  await delay(200);

  bodySolid.value = true;

  await delay(100);

  titleStage.value = "filled";

  await delay(300);

  titleStage.value = "bordered";

  await delay(100);

  titleStage.value = "clear";
  glitching.value = true;

  await delay(500);

  bodySolid.value = false;
  glitching.value = false;
  titleStage.value = "bordered";

  await delay(1000);

  emit("complete");
}

onMounted(() => {
  runBootLog();
});

onUnmounted(() => {
  document.body.classList.remove("solidBackground");
});
</script>

<template>
  <section id="boot_screen" :class="{ center: centered }">
    <template v-if="showingLog">
      <template v-for="(line, i) in lines" :key="i">{{ line }}<br /></template>
    </template>
    <h1
      v-else-if="titleStage !== 'hidden'"
      class="boot-title"
      :class="[`stage-${titleStage}`, { glitch: glitching }]"
    >
      DarkWinD_UI
    </h1>
  </section>
</template>

<style>
body.solidBackground {
  background: var(--color_light_black);
}
</style>

<style scoped>
section#boot_screen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  padding: 0;
  margin: 0;
  overflow: hidden;

  /* El genérico "monospace" del navegador ignoraba la mono del tema activo (--font_mono,
     ej. Fira Mono) — el log de arranque quedaba con una tipografía distinta al resto de
     la app en modo monoespaciado (terminal, reloj). */
  font-family: var(--font_mono), monospace;
  /* Fijo a 120% del tamaño base, SIN relación con "Tamaño de letra general" de
     Ajustes — el log de arranque y el logo de abajo son decorativos/de branding, no
     contenido que deba agrandarse o achicarse con la preferencia del usuario. */
  font-size: calc(1.4vh * 1.2);
  text-align: left;
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
  color: rgb(var(--color_r), var(--color_g), var(--color_b));
}

section#boot_screen.center {
  align-items: center;
  justify-content: center;
}

.boot-title {
  font-family: var(--font_main);
  font-size: calc(10vh * 1.2);
  text-align: center;
  border-bottom: 0.46vh solid rgb(var(--color_r), var(--color_g), var(--color_b));
  padding-top: 2vh;
  padding-right: 2vh;
  padding-left: 1.5vh;
  background-color: transparent;

  opacity: 0;
  animation-name: fadeInTitle;
  animation-duration: 300ms;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
  animation-iteration-count: 1;
}

.boot-title.stage-filled {
  background-color: rgb(var(--color_r), var(--color_g), var(--color_b));
  /* 0.46vh en vez de un px fijo: mismo valor que ya usa .boot-title más abajo para su
     border-bottom base — el resto del proyecto es vh de punta a punta (Sección 14.1
     del plan, ventana fullscreen-kiosk), un borde en px quedaba desproporcionado según
     la resolución real en vez de escalar con el viewport como todo lo demás. */
  border-bottom: 0.46vh solid rgb(var(--color_r), var(--color_g), var(--color_b));
}

.boot-title.stage-bordered {
  background-color: transparent;
  border: 0.46vh solid rgb(var(--color_r), var(--color_g), var(--color_b));
}

.boot-title.stage-clear {
  border: none;
}

.boot-title.glitch {
  border: none;
  color: transparent;
}

@keyframes fadeInTitle {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.boot-title::before {
  content: "DarkWinD_UI";
  display: block;
  transform: translateY(100%) translateX(-2%);
  clip-path: polygon(100% 0%, 100% 40%, 0% 40%, 0% 0%);
  color: rgba(var(--color_r), var(--color_g), var(--color_b), 0.8);

  animation-name: derezzer_top;
  animation-duration: 50ms;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  animation-direction: alternate-reverse;
  animation-play-state: paused;
  height: 0px;
  opacity: 0;
}

.boot-title.glitch::before {
  height: auto;
  opacity: 1;
  animation-play-state: running;
}

@keyframes derezzer_top {
  from {
    transform: translateY(100%) translateX(-1%);
  }
  to {
    transform: translateY(100%) translateX(-5%);
  }
}

.boot-title::after {
  content: "DarkWinD_UI";
  display: block;
  transform: translateY(-100%) translateX(2%);
  clip-path: polygon(100% 40%, 100% 100%, 0% 100%, 0% 40%);
  color: rgba(var(--color_r), var(--color_g), var(--color_b), 0.9);

  animation-name: derezzer_bottom;
  animation-duration: 50ms;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  animation-direction: alternate-reverse;
  animation-play-state: paused;
  height: 0px;
  opacity: 0;
}

.boot-title.glitch::after {
  height: auto;
  opacity: 1;
  animation-play-state: running;
}

@keyframes derezzer_bottom {
  from {
    transform: translateY(-100%) translateX(1%);
  }
  to {
    transform: translateY(-100%) translateX(3%);
  }
}
</style>
