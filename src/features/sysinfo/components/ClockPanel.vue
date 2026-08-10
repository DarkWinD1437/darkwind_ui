<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import PanelBox from "@/shared/components/PanelBox.vue";

const now = ref(new Date());
let timer: ReturnType<typeof setInterval> | null = null;

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

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
  <PanelBox title="Reloj" expandable>
    <div class="clock-time">
      {{ pad(now.getHours()) }}:{{ pad(now.getMinutes()) }}:{{ pad(now.getSeconds()) }}
    </div>
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
