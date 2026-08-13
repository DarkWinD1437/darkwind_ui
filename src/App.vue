<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useThemesStore } from "@/core/theme/stores/themes.store";
import { applyUiScale } from "@/core/theme/themeEngine";
import { audioManager } from "@/core/audio/audioManager";
import { resolveLocale, setLocale } from "@/core/i18n/i18n";
import { useSettingsStore } from "@/features/settings/stores/settings.store";
import { useViewportUnits } from "@/core/layout/useViewportUnits";
import BootSequence from "@/app/BootSequence.vue";
import AppShell from "@/app/AppShell.vue";

const themesStore = useThemesStore();
const settingsStore = useSettingsStore();
const viewport = useViewportUnits();
const ready = ref(false);
const skipIntro = ref(false);
const bootDone = ref(false);

onMounted(async () => {
  const settings = await settingsStore.load();
  // tauri-plugin-window-state restaura tamaño/posición/fullscreen de la sesión
  // anterior DESPUÉS de que la ventana ya se creó — puede pisar el
  // "fullscreen": true de tauri.conf.json con lo último que haya quedado guardado
  // (ej. si alguna vez terminó en modo ventana por cualquier motivo). Esto reafirma
  // en cada arranque el modo que pide Settings.forceFullscreen (en ambos sentidos,
  // no solo cuando es true) sin depender de lo que el plugin haya restaurado.
  await viewport.setFullscreen(settings.forceFullscreen).catch(() => {});
  await themesStore.applyThemeById(settings.theme);
  applyUiScale(settings.uiScale);
  setLocale(await resolveLocale(settings.language));
  // El original nunca reconfigura su equivalente de AudioManager según lo guardado en
  // settings.json (queda en los defaults del constructor hasta reiniciar) — acá sí se
  // aplican audio/audioVolume/disableFeedbackAudio reales desde el primer arranque.
  audioManager.configure({
    enabled: settings.audio,
    volume: settings.audioVolume,
    feedbackEnabled: !settings.disableFeedbackAudio,
  });
  skipIntro.value = settings.nointro;
  ready.value = true;
});
</script>

<template>
  <main v-if="ready" class="app-root">
    <BootSequence v-if="!skipIntro && !bootDone" @complete="bootDone = true" />
    <AppShell v-else />
  </main>
</template>

<style>
* {
  box-sizing: border-box;
}

/* Las secciones de AppShell dependen de que los tamaños en porcentaje se resuelvan
   contra <body> — igual que el original, que las agrega directo a document.body sin
   wrapper. Este wrapper solo existe como ancla de montaje de Vue, así que no debe
   participar del layout. */
.app-root {
  display: contents;
}
</style>
