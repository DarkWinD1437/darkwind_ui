<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { useI18n } from "vue-i18n";
import BaseModal from "@/features/modals/components/BaseModal.vue";
import { useShortcutsStore } from "../stores/shortcuts.store";
import { registerShortcutAction } from "../composables/useShortcutActions";
import { eventToTriggerString } from "../composables/useGlobalShortcuts";
import { useModalsStore } from "@/features/modals/stores/modals.store";
import type { Shortcut } from "@/core/persistence/types";

const { t } = useI18n();
const store = useShortcutsStore();
const modalsStore = useModalsStore();

const open = ref(false);
const saving = ref(false);
const list = reactive<Shortcut[]>([]);
// null = nada grabando; number = índice de una fila existente; -1 = la fila nueva.
const recordingIndex = ref<number | null>(null);

const newTrigger = ref("");
const newType = ref<"app" | "shell">("app");
const newAction = ref("");

async function openModal(): Promise<void> {
  if (!store.loaded) await store.load().catch(() => {});
  list.splice(0, list.length, ...store.list.map((s) => ({ ...s })));
  newTrigger.value = "";
  newType.value = "app";
  newAction.value = "";
  recordingIndex.value = null;
  open.value = true;
}

function closeModal(): void {
  recordingIndex.value = null;
  open.value = false;
}

function startRecording(index: number): void {
  recordingIndex.value = index;
}

function removeShortcut(index: number): void {
  void modalsStore
    .confirm({
      title: t("shortcuts.deleteTitle"),
      message: t("shortcuts.deleteMessage", { trigger: list[index].trigger }),
    })
    .then((confirmed) => {
      if (confirmed) list.splice(index, 1);
    });
}

function addShortcut(): void {
  if (!newTrigger.value || !newAction.value) return;
  list.push({ type: newType.value, trigger: newTrigger.value, action: newAction.value, enabled: true, linebreak: false });
  newTrigger.value = "";
  newAction.value = "";
  newType.value = "app";
}

// Captura la PRÓXIMA tecla (con sus modificadores) sea cual sea el modo activo de
// grabación — Escape cancela sin asignar nada, cualquier otra combinación se convierte
// en el nuevo trigger con el mismo formato que usa shortcuts.json ("Ctrl+Shift+X").
function handleRecordingKeydown(event: KeyboardEvent): void {
  if (recordingIndex.value === null) return;
  event.preventDefault();
  event.stopPropagation();
  if (event.key === "Escape") {
    recordingIndex.value = null;
    return;
  }
  const trigger = eventToTriggerString(event);
  if (!trigger) return;
  if (recordingIndex.value === -1) {
    newTrigger.value = trigger;
  } else {
    list[recordingIndex.value].trigger = trigger;
  }
  recordingIndex.value = null;
}

async function save(): Promise<void> {
  saving.value = true;
  try {
    await store.save(list.map((s) => ({ ...s })));
    open.value = false;
  } finally {
    saving.value = false;
  }
}

let unregister: (() => void) | null = null;
onMounted(() => {
  unregister = registerShortcutAction("SHORTCUTS", () => void openModal());
  // captura=true + se registra siempre (no solo mientras open), así funciona igual que
  // el resto de los atajos globales de la app frente a xterm.js.
  window.addEventListener("keydown", handleRecordingKeydown, true);
});
onBeforeUnmount(() => {
  unregister?.();
  window.removeEventListener("keydown", handleRecordingKeydown, true);
});

defineExpose({ openModal });
</script>

<template>
  <BaseModal v-if="open" :title="t('shortcuts.title')" width="50vw" @close="closeModal">
    <table class="shortcuts-table">
      <thead>
        <tr>
          <th>{{ t("shortcuts.trigger") }}</th>
          <th>{{ t("shortcuts.action") }}</th>
          <th>{{ t("shortcuts.type") }}</th>
          <th>{{ t("common.enabled") }}</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(shortcut, index) in list" :key="index" :class="{ disabled: !shortcut.enabled }">
          <td>
            <button
              type="button"
              class="trigger-btn"
              :class="{ recording: recordingIndex === index }"
              @click="startRecording(index)"
            >
              {{ recordingIndex === index ? t("shortcuts.recording") : shortcut.trigger }}
            </button>
          </td>
          <td><input v-model="shortcut.action" type="text" class="action-input" /></td>
          <td>{{ shortcut.type }}</td>
          <td>
            <input v-model="shortcut.enabled" type="checkbox" />
          </td>
          <td>
            <button type="button" class="row-delete" :title="t('common.delete')" @click="removeShortcut(index)">
              ✕
            </button>
          </td>
        </tr>
        <tr class="new-row">
          <td>
            <button
              type="button"
              class="trigger-btn"
              :class="{ recording: recordingIndex === -1 }"
              @click="recordingIndex = -1"
            >
              {{ recordingIndex === -1 ? t("shortcuts.recording") : newTrigger || t("shortcuts.clickToRecord") }}
            </button>
          </td>
          <td>
            <input v-model="newAction" type="text" class="action-input" :placeholder="t('shortcuts.actionPlaceholder')" />
          </td>
          <td>
            <select v-model="newType">
              <option value="app">app</option>
              <option value="shell">shell</option>
            </select>
          </td>
          <td></td>
          <td>
            <button type="button" class="row-add" :title="t('common.add')" @click="addShortcut">＋</button>
          </td>
        </tr>
      </tbody>
    </table>
    <p class="shortcuts-hint">{{ t("shortcuts.hint") }}</p>

    <div class="shortcuts-actions">
      <button type="button" class="shortcuts-btn shortcuts-btn-secondary" @click="closeModal">
        {{ t("common.cancel") }}
      </button>
      <button type="button" class="shortcuts-btn shortcuts-btn-primary" :disabled="saving" @click="save">
        {{ t("common.save") }}
      </button>
    </div>
  </BaseModal>
</template>

<style scoped>
.shortcuts-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 1.3vh;
}
.shortcuts-table th {
  text-align: left;
  text-transform: uppercase;
  font-size: 1.05vh;
  opacity: 0.6;
  padding: 0.4vh 0.6vh;
  border-bottom: 0.09vh solid rgba(var(--color_r), var(--color_g), var(--color_b), 0.3);
}
.shortcuts-table td {
  padding: 0.4vh 0.6vh;
  border-bottom: 0.09vh solid rgba(var(--color_r), var(--color_g), var(--color_b), 0.12);
}
.shortcuts-table tr.disabled {
  opacity: 0.4;
}
.shortcuts-table tr.new-row {
  opacity: 0.85;
}
.trigger-btn {
  font-family: inherit;
  font-size: 1.2vh;
  background: rgba(var(--color_r), var(--color_g), var(--color_b), 0.1);
  border: 0.09vh solid rgba(var(--color_r), var(--color_g), var(--color_b), 0.4);
  color: inherit;
  padding: 0.35vh 0.7vh;
  cursor: pointer;
  white-space: nowrap;
}
.trigger-btn.recording {
  background: rgb(var(--color_r), var(--color_g), var(--color_b));
  color: var(--color_black);
}
.action-input {
  width: 100%;
  box-sizing: border-box;
  background: rgba(var(--color_r), var(--color_g), var(--color_b), 0.08);
  border: 0.09vh solid rgba(var(--color_r), var(--color_g), var(--color_b), 0.3);
  color: inherit;
  font-family: inherit;
  font-size: 1.2vh;
  padding: 0.35vh 0.6vh;
}
/* Mismo fix que SettingsModal: el popup nativo de <select> ignoraba el fondo
   transparente y se dibujaba blanco con letra clara encima — casi ilegible. */
.shortcuts-table select {
  background-color: var(--color_light_black);
  border: 0.09vh solid rgba(var(--color_r), var(--color_g), var(--color_b), 0.3);
  color: inherit;
  color-scheme: dark;
  font-family: inherit;
  font-size: 1.2vh;
  cursor: pointer;
}
.row-delete,
.row-add {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  opacity: 0.7;
  font-size: 1.3vh;
}
.row-delete:hover,
.row-add:hover {
  opacity: 1;
}
.shortcuts-hint {
  margin: 1.2vh 0 0;
  opacity: 0.55;
  font-size: 1.05vh;
  line-height: 1.4;
}
.shortcuts-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.8vh;
  margin-top: 1.2vh;
  padding-top: 1vh;
  border-top: 0.09vh solid rgba(var(--color_r), var(--color_g), var(--color_b), 0.25);
}
.shortcuts-btn {
  font-family: inherit;
  font-size: 1.3vh;
  padding: 0.6vh 1.2vh;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.05vh;
}
.shortcuts-btn:disabled {
  opacity: 0.5;
  cursor: default;
}
.shortcuts-btn-primary {
  background: rgb(var(--color_r), var(--color_g), var(--color_b));
  color: var(--color_black);
  border: 0.09vh solid rgb(var(--color_r), var(--color_g), var(--color_b));
}
.shortcuts-btn-secondary {
  background: transparent;
  color: rgb(var(--color_r), var(--color_g), var(--color_b));
  border: 0.09vh solid rgba(var(--color_r), var(--color_g), var(--color_b), 0.5);
}
</style>
