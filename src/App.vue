<script setup lang="ts">
import { onMounted, ref } from "vue";
import { readSettings } from "@/core/persistence/settingsRepository";
import { useThemesStore } from "@/core/theme/stores/themes.store";
import BootSequence from "@/app/BootSequence.vue";
import AppShell from "@/app/AppShell.vue";

const themesStore = useThemesStore();
const ready = ref(false);
const skipIntro = ref(false);
const bootDone = ref(false);

onMounted(async () => {
  const settings = await readSettings();
  await themesStore.applyThemeById(settings.theme);
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
