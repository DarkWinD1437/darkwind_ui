<script setup lang="ts">
defineProps<{ title: string }>();
</script>

<template>
  <div class="panel-box">
    <h4 class="panel-box-title">{{ title }}</h4>
    <div class="panel-box-body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.panel-box {
  width: 100%;
  box-sizing: border-box;
  border: 0.09vh solid rgba(var(--color_r), var(--color_g), var(--color_b), 0.35);
  background: rgba(var(--color_r), var(--color_g), var(--color_b), 0.04);
  margin-bottom: 0.9vh;
  padding: 0.5vh 0.7vh;
  font-family: var(--font_main), sans-serif;
}

.panel-box-title {
  margin: 0 0 0.4vh 0;
  font-size: 0.85vh;
  font-weight: normal;
  letter-spacing: 0.05vh;
  opacity: 0.75;
  border-bottom: 0.09vh solid rgba(var(--color_r), var(--color_g), var(--color_b), 0.25);
  padding-bottom: 0.3vh;
  text-transform: uppercase;
}

.panel-box-body {
  font-size: 0.85vh;
}
</style>
