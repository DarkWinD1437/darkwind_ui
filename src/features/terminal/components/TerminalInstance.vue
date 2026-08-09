<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useTerminal } from "../composables/useTerminal";
import { useTerminalsStore } from "../stores/terminals.store";
import { useThemesStore } from "@/core/theme/stores/themes.store";
import { readSettings } from "@/core/persistence/settingsRepository";
import { buildXtermTheme } from "../terminalTheme";

const props = defineProps<{ tabKey: string; active: boolean }>();

const store = useTerminalsStore();
const themesStore = useThemesStore();
const container = ref<HTMLElement | null>(null);

let terminalApi: ReturnType<typeof useTerminal> | null = null;
let statusTimer: ReturnType<typeof setInterval> | null = null;

defineExpose({
  focus: () => terminalApi?.focus(),
  findNext: (query: string) => terminalApi?.findNext(query),
  findPrevious: (query: string) => terminalApi?.findPrevious(query),
});

onMounted(async () => {
  const settings = await readSettings();
  const theme = themesStore.current;

  terminalApi = useTerminal({
    shell: settings.shell,
    args: settings.shellArgs ? settings.shellArgs.split(" ") : [],
    cwd: settings.cwd,
    fontFamily: theme?.fonts.mono ?? "monospace",
    fontSize: settings.termFontSize,
    cursorStyle: theme?.terminal.cursorStyle ?? "block",
    theme: theme ? buildXtermTheme(theme) : {},
  });

  if (container.value) {
    const ptyId = await terminalApi.mount(container.value);
    store.setPtyId(props.tabKey, ptyId);
    if (props.active) terminalApi.focus();
  }

  statusTimer = setInterval(async () => {
    const status = await terminalApi?.fetchStatus();
    if (!status) return;
    store.updateStatus(props.tabKey, {
      cwd: status.cwd ?? undefined,
      processName: status.processName ?? undefined,
    });
  }, 1500);
});

onBeforeUnmount(() => {
  if (statusTimer) clearInterval(statusTimer);
  void terminalApi?.dispose();
});
</script>

<template>
  <pre ref="container" class="terminal-instance" :class="{ active }"></pre>
</template>

<style scoped>
.terminal-instance {
  height: 100%;
  width: 100%;
  margin: 0;
  overflow: hidden;
  position: absolute;
  inset: 0;
  z-index: -999;
  opacity: 0;
}

.terminal-instance.active {
  z-index: 1;
  opacity: 1;
}
</style>
