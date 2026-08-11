<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { convertFileSrc } from "@tauri-apps/api/core";
import BaseModal from "@/features/modals/components/BaseModal.vue";
import { useMediaPlayerStore } from "../stores/mediaPlayer.store";

const { t } = useI18n();
const store = useMediaPlayerStore();

const mediaRef = ref<HTMLMediaElement | null>(null);
const playing = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const volume = ref(1);
const isFullscreen = ref(false);
const controlsVisible = ref(true);
let hideControlsTimer: ReturnType<typeof setTimeout> | null = null;

const src = computed(() => (store.path ? convertFileSrc(store.path) : ""));
const fileName = computed(() => store.path?.split(/[/\\]/).pop() ?? "");

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

function togglePlay(): void {
  const el = mediaRef.value;
  if (!el) return;
  if (el.paused) void el.play();
  else el.pause();
}

function onSeek(event: Event): void {
  const el = mediaRef.value;
  if (!el) return;
  el.currentTime = Number((event.target as HTMLInputElement).value);
}

function onVolumeChange(): void {
  if (mediaRef.value) mediaRef.value.volume = volume.value;
}

// El menú de controles se auto-oculta SOLO en pantalla completa (en el modal normal
// ya es chico y no tapa nada, no hace falta esconderlo) — igual que cualquier
// reproductor de video: aparece con el mouse quieto reaparece al moverlo, y se
// cancela el temporizador mientras el mouse está encima de los controles mismos.
function scheduleHideControls(): void {
  if (hideControlsTimer) clearTimeout(hideControlsTimer);
  hideControlsTimer = setTimeout(() => {
    if (isFullscreen.value) controlsVisible.value = false;
  }, 3000);
}
function showControls(): void {
  controlsVisible.value = true;
  if (isFullscreen.value) scheduleHideControls();
}
function keepControlsVisible(): void {
  if (hideControlsTimer) clearTimeout(hideControlsTimer);
  controlsVisible.value = true;
}

// "Pantalla completa" simulada solo con CSS (position:fixed cubriendo el viewport +
// Teleport a <body>), NO con la Fullscreen API real del navegador
// (element.requestFullscreen()). Toda la ventana de la app ya corre en fullscreen
// forzado por Tauri (tauri.conf.json) — pedirle al WebView2 SU PROPIO fullscreen de
// encima terminaba en conflicto real: al salir, WebView2 devolvía la ventana nativa
// completa a su tamaño "restaurado" (800x600 del scaffold), no solo el video.
// Reportado por el usuario probando la app real.
function toggleFullscreen(): void {
  isFullscreen.value = !isFullscreen.value;
  if (isFullscreen.value) {
    scheduleHideControls();
  } else {
    controlsVisible.value = true;
    if (hideControlsTimer) clearTimeout(hideControlsTimer);
  }
}

// Escape sale de esta pantalla completa simulada en vez de cerrar todo el modal de
// una — mismo criterio que cualquier reproductor de video. stopImmediatePropagation
// evita que el Escape también dispare el cierre de BaseModal (ambos listeners están
// en window, en captura); sin esto, un solo Escape cerraría el reproductor entero en
// vez de solo salir de pantalla completa.
function handleFullscreenEscape(event: KeyboardEvent): void {
  if (event.key === "Escape" && isFullscreen.value) {
    event.stopImmediatePropagation();
    toggleFullscreen();
  }
}

function close(): void {
  isFullscreen.value = false;
  mediaRef.value?.pause();
  store.close();
}

// Reinicia el estado local de reproducción cada vez que se abre un archivo distinto —
// sin esto, la barra de progreso/tiempo del archivo anterior queda visible un
// instante antes de que el nuevo <video>/<audio> dispare sus propios eventos.
watch(
  () => store.path,
  () => {
    playing.value = false;
    currentTime.value = 0;
    duration.value = 0;
    isFullscreen.value = false;
  },
);

// captura=true + registrado desde el arranque (este componente vive montado siempre en
// AppShell, no solo mientras hay un video abierto) para correr ANTES que el listener
// de Escape que BaseModal registra recién cuando el modal se abre.
onMounted(() => window.addEventListener("keydown", handleFullscreenEscape, true));
onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleFullscreenEscape, true);
  if (hideControlsTimer) clearTimeout(hideControlsTimer);
});
</script>

<template>
  <BaseModal v-if="store.path" :title="fileName" width="42vw" @close="close">
    <div class="player" :class="{ 'player-audio': store.kind === 'audio' }">
      <!-- Mismo patrón que PanelBox: Teleport + :disabled reubica el MISMO nodo (con
           el <video> adentro, sin recrearlo) a <body> en vez de destruir/recrear —
           así la reproducción no se corta al entrar/salir de pantalla completa. -->
      <Teleport to="body" :disabled="!isFullscreen">
        <div
          v-if="store.kind === 'video'"
          class="player-video-container"
          :class="{ fullscreen: isFullscreen }"
          @mousemove="showControls"
        >
          <video
            ref="mediaRef"
            :src="src"
            class="player-media"
            @play="playing = true"
            @pause="playing = false"
            @timeupdate="currentTime = mediaRef?.currentTime ?? 0"
            @loadedmetadata="duration = mediaRef?.duration ?? 0"
            @dblclick="toggleFullscreen"
          ></video>

          <div
            class="player-controls"
            :class="{ 'controls-hidden': isFullscreen && !controlsVisible }"
            @mouseenter="keepControlsVisible"
            @mouseleave="isFullscreen && scheduleHideControls()"
          >
            <button type="button" class="player-play" @click="togglePlay">
              {{ playing ? "⏸" : "▶" }}
            </button>
            <span class="player-time">{{ formatTime(currentTime) }}</span>
            <input
              class="player-seek"
              type="range"
              min="0"
              :max="duration || 0"
              step="0.1"
              :value="currentTime"
              @input="onSeek"
            />
            <span class="player-time">{{ formatTime(duration) }}</span>
            <span class="player-volume-icon">🔊</span>
            <input
              v-model.number="volume"
              class="player-volume"
              type="range"
              min="0"
              max="1"
              step="0.05"
              @input="onVolumeChange"
            />
            <button
              type="button"
              class="player-fullscreen"
              :title="t('mediaPlayer.fullscreen')"
              @click="toggleFullscreen"
            >
              {{ isFullscreen ? "⤡" : "⤢" }}
            </button>
          </div>
        </div>
      </Teleport>

      <template v-if="store.kind === 'audio'">
        <audio
          ref="mediaRef"
          :src="src"
          @play="playing = true"
          @pause="playing = false"
          @timeupdate="currentTime = mediaRef?.currentTime ?? 0"
          @loadedmetadata="duration = mediaRef?.duration ?? 0"
        ></audio>
        <div class="player-audio-icon">♫</div>

        <div class="player-controls">
          <button type="button" class="player-play" @click="togglePlay">
            {{ playing ? "⏸" : "▶" }}
          </button>
          <span class="player-time">{{ formatTime(currentTime) }}</span>
          <input
            class="player-seek"
            type="range"
            min="0"
            :max="duration || 0"
            step="0.1"
            :value="currentTime"
            @input="onSeek"
          />
          <span class="player-time">{{ formatTime(duration) }}</span>
          <span class="player-volume-icon">🔊</span>
          <input
            v-model.number="volume"
            class="player-volume"
            type="range"
            min="0"
            max="1"
            step="0.05"
            @input="onVolumeChange"
          />
        </div>
      </template>
    </div>
    <p class="player-hint">{{ t("mediaPlayer.hint") }}</p>
  </BaseModal>
</template>

<style scoped>
.player {
  display: flex;
  flex-direction: column;
  gap: 0.8vh;
}
.player-video-container {
  position: relative;
  display: flex;
  flex-direction: column;
  background: #000;
}
/* Pantalla completa simulada: cubre el viewport real de la app con position:fixed en
   vez de pedir la Fullscreen API nativa del navegador (ver comentario en el script).
   z-index bien alto y fijo (no depende del contador de useModalStack) porque este
   overlay debe quedar SIEMPRE por encima de cualquier modal, incluido el propio
   BaseModal que lo contiene. */
.player-video-container.fullscreen {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  justify-content: center;
  z-index: 9999;
}
.player-video-container.fullscreen .player-media {
  max-height: 100vh;
  height: 100vh;
  object-fit: contain;
}
.player-video-container.fullscreen .player-controls {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.85));
  padding: 2vh 1.5vh 1vh;
  transition: opacity 0.3s ease;
}
.player-video-container.fullscreen .player-controls.controls-hidden {
  opacity: 0;
  pointer-events: none;
}
.player-media {
  width: 100%;
  max-height: 45vh;
  background: #000;
}
.player-audio {
  align-items: center;
}
.player-audio-icon {
  font-size: 6vh;
  opacity: 0.5;
  text-align: center;
  padding: 2vh 0;
}
.player-controls {
  display: flex;
  align-items: center;
  gap: 0.6vh;
  width: 100%;
  box-sizing: border-box;
}
.player-play,
.player-fullscreen {
  background: rgba(var(--color_r), var(--color_g), var(--color_b), 0.15);
  border: 0.09vh solid rgba(var(--color_r), var(--color_g), var(--color_b), 0.5);
  color: inherit;
  cursor: pointer;
  font-size: 1.3vh;
  padding: 0.4vh 0.8vh;
  flex-shrink: 0;
}
.player-time {
  font-size: 1.1vh;
  opacity: 0.75;
  white-space: nowrap;
  flex-shrink: 0;
}
.player-seek {
  flex: 1;
  accent-color: rgb(var(--color_r), var(--color_g), var(--color_b));
}
.player-volume {
  width: 6vh;
  accent-color: rgb(var(--color_r), var(--color_g), var(--color_b));
}
.player-volume-icon {
  flex-shrink: 0;
  opacity: 0.7;
}
.player-hint {
  margin: 1vh 0 0;
  opacity: 0.5;
  font-size: 0.75vh;
}
</style>
