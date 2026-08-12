<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { audioManager } from "@/core/audio/audioManager";

const { t } = useI18n();

// Mismo vocabulario visual que BootSequence.vue (glitch derezzer + bordes) pero NO
// comparte componente con él: la coreografía de arranque (varios segundos, boot log +
// title screen en 5 etapas) y la de cierre (rápida, ~2s, un solo golpe de glitch que
// termina en colapso) son secuencias con timings tan distintos que forzarlas a un
// mismo componente parametrizable habría sumado más complejidad que la que ahorra
// duplicar ~40 líneas de CSS de un efecto que además rara vez cambia.
const titleVisible = ref(true);
const titleGlitching = ref(true);
const titleCollapsing = ref(false);
const visibleLines = ref<string[]>([]);

const LINE_KEYS = ["shutdown.line1", "shutdown.line2", "shutdown.line3", "shutdown.line4"];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Duración total ~5.8s, a la par de lo que tarda el arranque (boot log + title
// screen) — a pedido del usuario, que la primera versión (~2s) le resultó demasiado
// rápida para alcanzar a leer el log de cierre y quedarse con el cursor parpadeando
// en "Hasta la próxima." antes de que la ventana se cierre de verdad.
async function run(): Promise<void> {
  audioManager.scan.play();
  await delay(1800);

  titleGlitching.value = false;
  titleCollapsing.value = true;
  await delay(400);
  titleVisible.value = false;

  for (const key of LINE_KEYS) {
    visibleLines.value.push(key);
    audioManager.stdout.play();
    await delay(450);
  }

  // Deja el cursor parpadeando sobre "Hasta la próxima." un buen rato antes de que
  // AppShell.vue destruya la ventana — sin esto, la última línea aparecía y
  // desaparecía casi en el mismo instante.
  await delay(1900);
}

onMounted(() => {
  void run();
});
</script>

<template>
  <Teleport to="body">
    <div class="shutdown-overlay" :class="{ shaking: titleGlitching }">
      <h1
        v-if="titleVisible"
        class="shutdown-title"
        :class="{ glitch: titleGlitching, collapsing: titleCollapsing }"
      >
        DarkWinD_UI
      </h1>

      <div class="shutdown-log">
        <p v-for="(key, i) in visibleLines" :key="key" class="shutdown-log-line">
          {{ t(key)
          }}<span v-if="i === visibleLines.length - 1 && visibleLines.length === LINE_KEYS.length" class="shutdown-cursor"
            >_</span
          >
        </p>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* Pieza nueva que el original nunca tuvo: eDEX-UI cierra con app.quit() directo, sin
   ningún paso visual (Sección 15 #13 / 19.13 del plan). z-index por encima de
   cualquier modal (BaseModal llega hasta ~330 vía useModalStack) — el cierre debe
   verse SIEMPRE, incluso con un modal abierto encima de todo lo demás. */
.shutdown-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  background: var(--color_light_black);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgb(var(--color_r), var(--color_g), var(--color_b));
  opacity: 0;
  animation: shutdown-fade-in 0.25s ease forwards;
}

/* Temblor sutil de TODO el overlay mientras el título está glitcheando — a pedido del
   usuario ("más caótico"), no solo el texto se distorsiona, el marco entero vibra un
   poco, como si el sistema estuviera perdiendo estabilidad antes de apagarse. */
.shutdown-overlay.shaking {
  animation:
    shutdown-fade-in 0.25s ease forwards,
    shutdown-shake 90ms steps(2) infinite;
}
@keyframes shutdown-shake {
  0% {
    transform: translate(0, 0);
  }
  25% {
    transform: translate(-0.15vh, 0.1vh);
  }
  50% {
    transform: translate(0.12vh, -0.1vh);
  }
  75% {
    transform: translate(-0.1vh, -0.06vh);
  }
  100% {
    transform: translate(0, 0);
  }
}

/* Título con el mismo truco de "derezz" que BootSequence.vue (duplicar el texto en 2
   pseudo-elementos recortados con clip-path que tiemblan en direcciones opuestas) pero
   arrancando YA glitcheando en vez de construirse hacia el glitch — acá es lo primero
   que se ve, el arranque hace el camino inverso. */
.shutdown-title {
  font-family: var(--font_main);
  font-size: 8vh;
  text-align: center;
  border: 0.46vh solid rgb(var(--color_r), var(--color_g), var(--color_b));
  padding: 2vh 2vh 1.6vh;
  position: relative;
  margin: 0 0 2vh;
  transition:
    transform 0.32s cubic-bezier(0.6, 0, 1, 1),
    opacity 0.32s ease;
}
.shutdown-title.collapsing {
  transform: scale(0.82);
  opacity: 0;
}
.shutdown-title.glitch {
  border-color: transparent;
  color: transparent;
}

.shutdown-title::before,
.shutdown-title::after {
  content: "DarkWinD_UI";
  display: block;
  height: 0px;
  opacity: 0;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  animation-direction: alternate-reverse;
  animation-play-state: paused;
}
.shutdown-title::before {
  transform: translateY(100%) translateX(-2%);
  clip-path: polygon(100% 0%, 100% 40%, 0% 40%, 0% 0%);
  color: rgba(var(--color_r), var(--color_g), var(--color_b), 0.8);
  animation-name: shutdown-derez-top;
  animation-duration: 35ms;
}
.shutdown-title::after {
  transform: translateY(-100%) translateX(2%);
  clip-path: polygon(100% 40%, 100% 100%, 0% 100%, 0% 40%);
  color: rgba(var(--color_r), var(--color_g), var(--color_b), 0.9);
  animation-name: shutdown-derez-bottom;
  animation-duration: 35ms;
}
.shutdown-title.glitch::before,
.shutdown-title.glitch::after {
  height: auto;
  opacity: 1;
  animation-play-state: running;
}
@keyframes shutdown-derez-top {
  from {
    transform: translateY(100%) translateX(-1%);
  }
  to {
    transform: translateY(100%) translateX(-7%);
  }
}
@keyframes shutdown-derez-bottom {
  from {
    transform: translateY(-100%) translateX(1%);
  }
  to {
    transform: translateY(-100%) translateX(5%);
  }
}

.shutdown-log {
  font-family: var(--font_mono), monospace;
  font-size: 1.3vh;
  text-align: center;
  min-height: 7vh;
}
.shutdown-log-line {
  margin: 0.35vh 0;
  opacity: 0;
  animation: shutdown-line-in 0.28s ease forwards;
}
.shutdown-log-line:last-child {
  font-weight: bold;
  letter-spacing: 0.05vh;
}
@keyframes shutdown-line-in {
  from {
    opacity: 0;
    transform: translateY(0.5vh);
  }
  to {
    opacity: 0.85;
    transform: translateY(0);
  }
}

.shutdown-cursor {
  display: inline-block;
  margin-left: 0.3ch;
  animation: shutdown-blink 1s steps(1) infinite;
}
@keyframes shutdown-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes shutdown-blink {
  0%,
  49% {
    opacity: 1;
  }
  50%,
  100% {
    opacity: 0;
  }
}
</style>
