<script setup lang="ts">
import { computed } from "vue";
import type { IconDef } from "../icons";

const props = defineProps<{ icon: IconDef }>();
const svg = computed(() => props.icon.markup);
</script>

<template>
  <!-- El markup viene siempre de icons.ts (set estático propio, sin ningún dato de
       usuario/nombre de archivo interpolado dentro del SVG), nunca de una cadena
       arbitraria. -->
  <!-- eslint-disable-next-line vue/no-v-html -->
  <svg class="file-icon" :viewBox="icon.viewBox" v-html="svg" />
</template>

<style scoped>
.file-icon {
  width: 100%;
  height: 100%;
  fill: currentColor;
  stroke: currentColor;
}
</style>
