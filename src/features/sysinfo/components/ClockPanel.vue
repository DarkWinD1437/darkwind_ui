<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import PanelBox from "@/shared/components/PanelBox.vue";
import { useSettingsStore } from "@/features/settings/stores/settings.store";

const { t } = useI18n();
const settingsStore = useSettingsStore();
const now = ref(new Date());
let timer: ReturnType<typeof setInterval> | null = null;

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

// settings.clockHours existía desde antes de esta fase pero nunca se leía en ningún
// lado (el reloj siempre mostraba 24h fijo) — ahora sí decide el formato real.
const timeLabel = computed(() => {
  const hours24 = now.value.getHours();
  const mm = pad(now.value.getMinutes());
  const ss = pad(now.value.getSeconds());
  if (settingsStore.current?.clockHours === 12) {
    const period = hours24 >= 12 ? "PM" : "AM";
    const hours12 = hours24 % 12 || 12;
    return `${hours12}:${mm}:${ss} ${period}`;
  }
  return `${pad(hours24)}:${mm}:${ss}`;
});

onMounted(() => {
  timer = setInterval(() => {
    now.value = new Date();
  }, 1000);
});

onBeforeUnmount(() => {
  if (timer) clearInterval(timer);
});
</script>

<template>
  <PanelBox :title="t('panels.clock.title')" expandable>
    <div class="clock-time">{{ timeLabel }}</div>
    <div class="clock-date">{{ now.toLocaleDateString() }}</div>
  </PanelBox>
</template>

<style scoped>
.clock-time {
  font-size: 1.9vh;
  font-family: var(--font_mono), monospace;
  line-height: 1.1;
}
.clock-date {
  opacity: 0.6;
  margin-top: 0.2vh;
}
</style>
