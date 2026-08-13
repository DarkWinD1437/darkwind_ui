<script setup lang="ts">
import BaseModal from "./BaseModal.vue";
import { useModalsStore } from "../stores/modals.store";

const store = useModalsStore();

const ICON: Record<string, string> = {
  error: "✕",
  warning: "⚠",
  info: "ℹ",
  confirm: "?",
};
</script>

<template>
  <BaseModal
    v-for="alert in store.alerts"
    :key="alert.id"
    :title="alert.title"
    width="26vw"
    :closable="alert.cancelLabel !== null"
    @close="store.resolve(alert.id, false)"
  >
    <div class="alert-body">
      <span class="alert-icon" :class="`alert-icon-${alert.type}`">{{ ICON[alert.type] }}</span>
      <p class="alert-message">{{ alert.message }}</p>
    </div>
    <div class="alert-actions">
      <button
        v-if="alert.cancelLabel"
        type="button"
        class="alert-btn alert-btn-secondary"
        @click="store.resolve(alert.id, false)"
      >
        {{ alert.cancelLabel }}
      </button>
      <button type="button" class="alert-btn alert-btn-primary" @click="store.resolve(alert.id, true)">
        {{ alert.confirmLabel }}
      </button>
    </div>
  </BaseModal>
</template>

<style scoped>
.alert-body {
  display: flex;
  gap: 1vh;
  align-items: flex-start;
}
.alert-icon {
  flex-shrink: 0;
  width: 2.4vh;
  height: 2.4vh;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: calc(1.3vh * var(--ui-font-scale, 1));
  border: 0.09vh solid currentColor;
}
.alert-icon-error {
  color: #ff5f5f;
}
.alert-icon-warning {
  color: #f0c14b;
}
.alert-icon-info,
.alert-icon-confirm {
  color: rgb(var(--color_r), var(--color_g), var(--color_b));
}
.alert-message {
  margin: 0;
  line-height: 1.5;
  white-space: pre-line;
}
.alert-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.8vh;
  margin-top: 1.6vh;
}
.alert-btn {
  font-family: inherit;
  font-size: calc(1.3vh * var(--ui-font-scale, 1));
  padding: 0.6vh 1.2vh;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.05vh;
}
.alert-btn-primary {
  background: rgb(var(--color_r), var(--color_g), var(--color_b));
  color: var(--color_black);
  border: 0.09vh solid rgb(var(--color_r), var(--color_g), var(--color_b));
}
.alert-btn-secondary {
  background: transparent;
  color: rgb(var(--color_r), var(--color_g), var(--color_b));
  border: 0.09vh solid rgba(var(--color_r), var(--color_g), var(--color_b), 0.5);
}
</style>
