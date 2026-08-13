<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { useI18n } from "vue-i18n";
import BaseModal from "@/features/modals/components/BaseModal.vue";
import { useSettingsStore } from "../stores/settings.store";
import { useThemesStore } from "@/core/theme/stores/themes.store";
import { useKeyboardStore } from "@/features/keyboard/stores/keyboard.store";
import { registerShortcutAction } from "@/features/shortcuts/composables/useShortcutActions";
import type { Settings } from "@/core/persistence/types";

const { t } = useI18n();
const settingsStore = useSettingsStore();
const themesStore = useThemesStore();
const keyboardStore = useKeyboardStore();

const open = ref(false);
const saving = ref(false);
const draft = reactive<Settings>({
  shell: "",
  shellArgs: "",
  cwd: "",
  keyboard: "en-US",
  theme: "tron",
  language: "auto",
  uiScale: 1,
  virtualKeyboard: true,
  termFontSize: 15,
  audio: true,
  audioVolume: 1,
  disableFeedbackAudio: false,
  clockHours: 24,
  pingAddr: "1.1.1.1",
  port: 3000,
  nointro: false,
  nocursor: false,
  forceFullscreen: true,
  excludeThreadsFromToplist: true,
  hideDotfiles: false,
  fsListView: false,
  experimentalGlobeFeatures: false,
  experimentalFeatures: false,
});

async function openModal(): Promise<void> {
  const current = settingsStore.current ?? (await settingsStore.load());
  Object.assign(draft, current);
  await Promise.all([themesStore.refreshAvailable(), keyboardStore.refreshAvailable()]);
  open.value = true;
}

function closeModal(): void {
  open.value = false;
}

async function save(): Promise<void> {
  saving.value = true;
  try {
    await settingsStore.update({ ...draft });
    open.value = false;
  } finally {
    saving.value = false;
  }
}

let unregister: (() => void) | null = null;
onMounted(() => {
  unregister = registerShortcutAction("SETTINGS", () => void openModal());
});
onBeforeUnmount(() => unregister?.());

defineExpose({ openModal });
</script>

<template>
  <BaseModal v-if="open" :title="t('settings.title')" width="46vw" @close="closeModal">
    <div class="settings-grid">
      <section class="settings-section">
        <h5>{{ t("settings.appearance") }}</h5>
        <label class="settings-field">
          <span>{{ t("settings.theme") }}</span>
          <select v-model="draft.theme">
            <option v-for="id in themesStore.available" :key="id" :value="id">{{ id }}</option>
          </select>
        </label>
        <label class="settings-field">
          <span>{{ t("settings.keyboardLayout") }}</span>
          <select v-model="draft.keyboard">
            <option v-for="id in keyboardStore.available" :key="id" :value="id">{{ id }}</option>
          </select>
        </label>
        <label class="settings-field settings-field-check">
          <input v-model="draft.virtualKeyboard" type="checkbox" />
          <span>{{ t("settings.virtualKeyboard") }}</span>
        </label>
        <label class="settings-field">
          <span>{{ t("settings.language") }}</span>
          <select v-model="draft.language">
            <option value="auto">{{ t("settings.languageAuto") }}</option>
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </label>
        <label class="settings-field">
          <span>{{ t("settings.uiScale") }} ({{ Math.round(draft.uiScale * 100) }}%)</span>
          <input v-model.number="draft.uiScale" type="range" min="0.85" max="1.4" step="0.05" />
        </label>
        <label class="settings-field">
          <span>{{ t("settings.termFontSize") }}</span>
          <input v-model.number="draft.termFontSize" type="number" min="8" max="32" />
        </label>
        <label class="settings-field">
          <span>{{ t("settings.clockHours") }}</span>
          <select v-model.number="draft.clockHours">
            <option :value="24">24h</option>
            <option :value="12">12h</option>
          </select>
        </label>
      </section>

      <section class="settings-section">
        <h5>{{ t("settings.audio") }}</h5>
        <label class="settings-field settings-field-check">
          <input v-model="draft.audio" type="checkbox" />
          <span>{{ t("settings.audioEnabled") }}</span>
        </label>
        <label class="settings-field">
          <span>{{ t("settings.audioVolume") }} ({{ Math.round(draft.audioVolume * 100) }}%)</span>
          <input v-model.number="draft.audioVolume" type="range" min="0" max="1" step="0.05" />
        </label>
        <label class="settings-field settings-field-check">
          <input v-model="draft.disableFeedbackAudio" type="checkbox" />
          <span>{{ t("settings.disableFeedbackAudio") }}</span>
        </label>
      </section>

      <section class="settings-section">
        <h5>{{ t("settings.terminalNetwork") }}</h5>
        <label class="settings-field">
          <span>{{ t("settings.shell") }}</span>
          <input v-model="draft.shell" type="text" />
        </label>
        <label class="settings-field">
          <span>{{ t("settings.shellArgs") }}</span>
          <input v-model="draft.shellArgs" type="text" />
        </label>
        <label class="settings-field">
          <span>{{ t("settings.cwd") }}</span>
          <input v-model="draft.cwd" type="text" placeholder="C:\" />
        </label>
        <label class="settings-field">
          <span>{{ t("settings.pingAddr") }}</span>
          <input v-model="draft.pingAddr" type="text" />
        </label>
      </section>

      <section class="settings-section">
        <h5>{{ t("settings.behavior") }}</h5>
        <label class="settings-field">
          <span>{{ t("settings.windowMode") }}</span>
          <select v-model="draft.forceFullscreen">
            <option :value="true">{{ t("settings.windowModeFullscreen") }}</option>
            <option :value="false">{{ t("settings.windowModeWindowed") }}</option>
          </select>
        </label>
        <label class="settings-field settings-field-check">
          <input v-model="draft.nointro" type="checkbox" />
          <span>{{ t("settings.nointro") }}</span>
        </label>
        <label class="settings-field settings-field-check">
          <input v-model="draft.nocursor" type="checkbox" />
          <span>{{ t("settings.nocursor") }}</span>
        </label>
        <label class="settings-field settings-field-check">
          <input v-model="draft.excludeThreadsFromToplist" type="checkbox" />
          <span>{{ t("settings.excludeThreads") }}</span>
        </label>
        <label class="settings-field settings-field-check">
          <input v-model="draft.hideDotfiles" type="checkbox" />
          <span>{{ t("settings.hideDotfiles") }}</span>
        </label>
        <label class="settings-field settings-field-check">
          <input v-model="draft.fsListView" type="checkbox" />
          <span>{{ t("settings.fsListView") }}</span>
        </label>
      </section>

      <section class="settings-section">
        <h5>{{ t("settings.experimental") }}</h5>
        <label class="settings-field settings-field-check">
          <input v-model="draft.experimentalGlobeFeatures" type="checkbox" />
          <span>{{ t("settings.experimentalGlobe") }}</span>
        </label>
        <label class="settings-field settings-field-check">
          <input v-model="draft.experimentalFeatures" type="checkbox" />
          <span>{{ t("settings.experimentalGeneral") }}</span>
        </label>
      </section>
    </div>

    <div class="settings-actions">
      <button type="button" class="settings-btn settings-btn-secondary" @click="closeModal">
        {{ t("common.cancel") }}
      </button>
      <button type="button" class="settings-btn settings-btn-primary" :disabled="saving" @click="save">
        {{ t("common.save") }}
      </button>
    </div>
  </BaseModal>
</template>

<style scoped>
.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.6vh;
}
.settings-section h5 {
  margin: 0 0 0.8vh;
  font-size: calc(1.3vh * var(--ui-font-scale, 1));
  text-transform: uppercase;
  letter-spacing: 0.05vh;
  opacity: 0.7;
  border-bottom: 0.09vh solid rgba(var(--color_r), var(--color_g), var(--color_b), 0.25);
  padding-bottom: 0.4vh;
}
.settings-field {
  display: flex;
  flex-direction: column;
  gap: 0.25vh;
  margin-bottom: 0.9vh;
  font-size: calc(1.4vh * var(--ui-font-scale, 1));
}
.settings-field-check {
  flex-direction: row;
  align-items: center;
  gap: 0.6vh;
}
.settings-field select,
.settings-field input[type="text"],
.settings-field input[type="number"] {
  background-color: rgba(var(--color_r), var(--color_g), var(--color_b), 0.08);
  border: 0.09vh solid rgba(var(--color_r), var(--color_g), var(--color_b), 0.4);
  color: inherit;
  font-family: inherit;
  font-size: calc(1.4vh * var(--ui-font-scale, 1));
  padding: 0.5vh 0.6vh;
}
/* Sin esto, el popup nativo de <select> se dibujaba con fondo blanco (WebView2 no
   respeta el `background` transparente/rgba del elemento para ese popup) mientras el
   texto seguía con el color de acento del tema — casi ilegible. `color-scheme: dark`
   + un fondo SÓLIDO (no rgba) resuelve el popup nativo sin tocar el resto del input. */
.settings-field select {
  background-color: var(--color_light_black);
  color-scheme: dark;
  cursor: pointer;
}
/* El spinner nativo de type="number" (flechitas arriba/abajo) se dibuja con los
   colores por defecto del navegador, sin heredar el tema — se oculta en vez de
   intentar re-tematizarlo, ya que este campo ya tiene flechas de teclado (↑↓)
   nativas del sistema operativo que cumplen la misma función. */
.settings-field input[type="number"]::-webkit-inner-spin-button,
.settings-field input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.settings-field input[type="number"] {
  appearance: textfield;
}
.settings-field input[type="range"] {
  accent-color: rgb(var(--color_r), var(--color_g), var(--color_b));
}
.settings-field input[type="checkbox"] {
  accent-color: rgb(var(--color_r), var(--color_g), var(--color_b));
  width: 1.4vh;
  height: 1.4vh;
}
.settings-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.8vh;
  margin-top: 1.6vh;
  padding-top: 1vh;
  border-top: 0.09vh solid rgba(var(--color_r), var(--color_g), var(--color_b), 0.25);
}
.settings-btn {
  font-family: inherit;
  font-size: calc(1.3vh * var(--ui-font-scale, 1));
  padding: 0.6vh 1.2vh;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.05vh;
}
.settings-btn:disabled {
  opacity: 0.5;
  cursor: default;
}
.settings-btn-primary {
  background: rgb(var(--color_r), var(--color_g), var(--color_b));
  color: var(--color_black);
  border: 0.09vh solid rgb(var(--color_r), var(--color_g), var(--color_b));
}
.settings-btn-secondary {
  background: transparent;
  color: rgb(var(--color_r), var(--color_g), var(--color_b));
  border: 0.09vh solid rgba(var(--color_r), var(--color_g), var(--color_b), 0.5);
}
</style>
