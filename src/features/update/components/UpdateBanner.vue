<script setup lang="ts">
import { markRaw, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { openUrl } from "@tauri-apps/plugin-opener";
import BaseModal from "@/features/modals/components/BaseModal.vue";

const { t } = useI18n();

// Apunta siempre al último release publicado — el mismo endpoint que ya usa
// tauri.conf.json (plugins.updater.endpoints) para el chequeo automático.
const RELEASES_URL = "https://github.com/DarkWinD1437/darkwind_ui/releases/latest";

const update = ref<Update | null>(null);
const dismissed = ref(false);
const downloading = ref(false);
const installing = ref(false);
const progress = ref(0);
const error = ref(false);

onMounted(async () => {
  try {
    // markRaw es necesario: Update extiende Resource, que guarda su estado en campos
    // privados vía WeakMap keyeado por identidad de objeto. El Proxy reactivo de Vue
    // cambia esa identidad (this pasa a ser el proxy, no la instancia real) y rompe
    // download/install con "Cannot read private member from an object whose class did
    // not declare it" — sin este fix el botón "Actualizar ahora" fallaba siempre.
    const result = await check();
    update.value = result ? markRaw(result) : null;
  } catch {
    // Sin internet, endpoint caído, o sin ventana Tauri real detrás (ej. arnés de
    // tests) — no hay forma de saber si hay una versión nueva, pero no bloquea el
    // resto del arranque de la app.
  }
});

function viewOnGithub(): void {
  void openUrl(RELEASES_URL);
}

async function updateNow(): Promise<void> {
  if (!update.value) return;
  downloading.value = true;
  installing.value = false;
  error.value = false;
  progress.value = 0;
  let total = 0;
  let downloaded = 0;
  try {
    await update.value.downloadAndInstall((event) => {
      if (event.event === "Started") {
        total = event.data.contentLength ?? 0;
      } else if (event.event === "Progress") {
        downloaded += event.data.chunkLength;
        progress.value = total > 0 ? Math.min(100, Math.round((downloaded / total) * 100)) : 0;
      } else if (event.event === "Finished") {
        // downloadAndInstall() no resuelve hasta que el instalador NSIS termina de
        // correr en silencio (unos segundos más) — sin esto la barra se queda
        // congelada en el último % de la descarga sin explicar por qué.
        installing.value = true;
      }
    });
    await relaunch();
  } catch {
    error.value = true;
    downloading.value = false;
    installing.value = false;
  }
}

// Sin persistir el descarte en Settings: si la próxima vez que arranca la app la
// versión instalada sigue desactualizada, este mismo modal vuelve a aparecer — es el
// comportamiento pedido, no un olvido de guardar un flag de "no preguntar de nuevo".
function cancel(): void {
  void update.value?.close();
  dismissed.value = true;
}
</script>

<template>
  <BaseModal
    v-if="update && !dismissed"
    :title="t('update.title')"
    :closable="!downloading"
    width="46vw"
    @close="cancel"
  >
    <p class="update-message">
      {{ t("update.available", { version: update.version, current: update.currentVersion }) }}
    </p>

    <template v-if="update.body">
      <h5 class="update-notes-title">{{ t("update.notesTitle") }}</h5>
      <pre class="update-notes">{{ update.body }}</pre>
    </template>

    <p v-if="downloading || installing" class="update-progress">
      <template v-if="installing">{{ t("update.installing") }}</template>
      <template v-else>{{ t("update.downloading") }} {{ progress }}%</template>
    </p>
    <p v-if="error" class="update-error">{{ t("update.error") }}</p>

    <div class="update-actions">
      <button type="button" class="update-btn" :disabled="downloading" @click="viewOnGithub">
        {{ t("update.viewOnGithub") }}
      </button>
      <button
        type="button"
        class="update-btn update-btn-primary"
        :disabled="downloading"
        @click="updateNow"
      >
        {{ t("update.updateNow") }}
      </button>
      <button type="button" class="update-btn" :disabled="downloading" @click="cancel">
        {{ t("update.cancel") }}
      </button>
    </div>
  </BaseModal>
</template>

<style scoped>
.update-message {
  margin: 0 0 1vh;
}

.update-notes-title {
  margin: 1vh 0 0.5vh;
  font-size: calc(1.1vh * var(--ui-font-scale, 1));
  opacity: 0.6;
  text-transform: uppercase;
  letter-spacing: 0.05vh;
}

.update-notes {
  margin: 0;
  padding: 0.8vh 1vh;
  max-height: 30vh;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: var(--font_mono), monospace;
  font-size: calc(1.05vh * var(--ui-font-scale, 1));
  background: rgba(var(--color_r), var(--color_g), var(--color_b), 0.06);
  border: 0.09vh solid rgba(var(--color_r), var(--color_g), var(--color_b), 0.25);
}

.update-progress {
  margin: 1vh 0 0;
}

.update-error {
  margin: 1vh 0 0;
  color: #ff5f5f;
}

.update-actions {
  display: flex;
  gap: 0.6vh;
  margin-top: 1.6vh;
}

.update-btn {
  font-family: inherit;
  font-size: calc(1.1vh * var(--ui-font-scale, 1));
  padding: 0.5vh 1vh;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.05vh;
  background: transparent;
  color: rgb(var(--color_r), var(--color_g), var(--color_b));
  border: 0.09vh solid rgba(var(--color_r), var(--color_g), var(--color_b), 0.5);
}

.update-btn-primary {
  background: rgb(var(--color_r), var(--color_g), var(--color_b));
  color: var(--color_black);
  border-color: rgb(var(--color_r), var(--color_g), var(--color_b));
}

.update-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
</style>
