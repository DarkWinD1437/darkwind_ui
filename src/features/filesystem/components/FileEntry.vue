<script setup lang="ts">
import FileIcon from "./FileIcon.vue";
import type { IconDef } from "../icons";

defineProps<{
  name: string;
  icon: IconDef;
  listView: boolean;
  hidden?: boolean;
  sizeLabel?: string;
  dateLabel?: string;
  title?: string;
}>();

const emit = defineEmits<{ activate: [] }>();
</script>

<template>
  <div
    class="file-entry"
    :class="{ 'list-view': listView, hidden }"
    :title="title ?? name"
    @click="emit('activate')"
  >
    <div class="file-entry-icon"><FileIcon :icon="icon" /></div>
    <div class="file-entry-name">{{ name }}</div>
    <div v-if="listView" class="file-entry-size">{{ sizeLabel }}</div>
    <div v-if="listView" class="file-entry-date">{{ dateLabel }}</div>
  </div>
</template>

<style scoped>
.file-entry {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.3vh;
  cursor: pointer;
  opacity: 0.85;
  transition: opacity 0.2s linear;
  padding: 0.3vh;
  box-sizing: border-box;
  overflow: hidden;
}
.file-entry:hover,
.file-entry:active {
  opacity: 1;
  background: rgba(var(--color_r), var(--color_g), var(--color_b), 0.12);
}
.file-entry.hidden {
  opacity: 0.45;
}
.file-entry-icon {
  width: 3.2vh;
  height: 3.2vh;
  flex: none;
}
.file-entry-name {
  font-size: 0.85vh;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}

.file-entry.list-view {
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap: 0.8vh;
  padding: 0.5vh 0.6vh;
}
.file-entry.list-view .file-entry-icon {
  width: 2.4vh;
  height: 2.4vh;
}
.file-entry.list-view .file-entry-name {
  text-align: left;
  flex: 1;
  /* En grilla el nombre queda debajo del ícono grande, así que 0.85vh se lee bien; en
     lista es la única referencia visual de tamaño en una fila angosta y se sentía
     "ultra chico" — se agranda para que sea cómodo de leer en una sola línea. */
  font-size: 1.05vh;
}
.file-entry.list-view .file-entry-size {
  width: 15%;
  font-size: 0.95vh;
  opacity: 0.6;
  text-align: right;
}
.file-entry.list-view .file-entry-date {
  width: 30%;
  font-size: 0.95vh;
  opacity: 0.6;
  text-align: right;
}
</style>
