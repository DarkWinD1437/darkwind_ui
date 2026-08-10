<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { useKeyboard } from "../composables/useKeyboard";
import { useKeyboardStore } from "../stores/keyboard.store";
import { useTerminalsStore } from "@/features/terminal/stores/terminals.store";
import { readSettings } from "@/core/persistence/settingsRepository";
import { audioManager } from "@/core/audio/audioManager";
import { CTRL_SEQUENCES } from "../deadKeys";
import type { KeyDef } from "../keyboard.schema";

const ARROW_ICONS: Record<string, string> = {
  "ESCAPED|-- ICON: ARROW_UP": "↑",
  "ESCAPED|-- ICON: ARROW_DOWN": "↓",
  "ESCAPED|-- ICON: ARROW_LEFT": "←",
  "ESCAPED|-- ICON: ARROW_RIGHT": "→",
};

// La animación de "encendido" (ver <style>) se dispara sola cuando el layout
// realmente termina de cargar, en vez de en un instante fijo del timing de arranque
// de AppShell — el layout llega vía IPC async (a diferencia del original, que lo leía
// sync con fs.readFileSync), así que atarla a un timer fijo podía dejar el teclado
// vacío durante la animación "oficial" del arranque y recién armarse de golpe después,
// como una segunda animación separada.
const stage = ref<"" | "animation_state_1" | "animation_state_1 animation_state_2">("");

const layoutStore = useKeyboardStore();
const terminalsStore = useTerminalsStore();

const keyboard = useKeyboard({
  writeToTerminal: (data) => {
    const ptyId = terminalsStore.activeTab?.ptyId;
    if (ptyId) void invoke("pty_write", { id: ptyId, data });
  },
  playKeySound: () => audioManager.stdin.play(),
  playEnterSound: () => audioManager.granted.play(),
  isLinkedToTerm: () => layoutStore.linkedToTerm,
});

// El original divide Enter en dos piezas (una por fila, formando una "L" tipo teclado
// ISO) porque en su CSS ambas filas quedan perfectamente alineadas entre sí. Acá cada
// fila se centra de forma independiente (flex + justify-content:center) y el ancho
// total de cada fila varía según el layout activo, así que las dos piezas no
// coincidían de forma confiable — se veían como dos botones sueltos, no como una
// tecla. Se simplifica a una sola tecla Enter unificada (se descarta la pieza vacía
// de continuación) — más robusto que perseguir una alineación pixel-perfect frágil.
const rows = computed(() =>
  Object.entries(layoutStore.current ?? {}).map(
    ([rowId, keys]) => [rowId, keys.filter((k) => !(k.cmd === "\r" && k.name === ""))] as const,
  ),
);

function displayName(name: string | undefined): string {
  if (name && ARROW_ICONS[name]) return ARROW_ICONS[name];
  return name ?? "";
}

// Texto grande central: en modo Fn muestra fnName; si no, shift/capsLock promueven
// shiftName al centro (igual que el original, que reutiliza shift_name también como
// texto visible en mayúscula sostenida — no hay un campo de texto dedicado a capslock).
function primaryText(key: KeyDef): string {
  if (keyboard.modifiers.fn && key.fnName) return displayName(key.fnName);
  if ((keyboard.modifiers.shift || keyboard.modifiers.capsLock) && key.shiftName) {
    return displayName(key.shiftName);
  }
  return displayName(key.name);
}

// Corner superior-izquierda: normalmente el shiftName pequeño; cuando shift/capsLock
// está activo, ahí se "degrada" el name base (que dejó de ser el texto principal).
function cornerTopLeft(key: KeyDef): string {
  if (keyboard.modifiers.fn) return "";
  if ((keyboard.modifiers.shift || keyboard.modifiers.capsLock) && key.shiftName) {
    return displayName(key.name);
  }
  return displayName(key.shiftName);
}

function cornerBottomRight(key: KeyDef): string {
  if (keyboard.modifiers.fn) return "";
  return displayName(key.altName);
}

function cornerTopRight(key: KeyDef): string {
  return displayName(key.altShiftName);
}

function isToggleActive(key: KeyDef): boolean {
  if (key.cmd === "ESCAPED|-- CAPSLCK: ON") return keyboard.modifiers.capsLock;
  if (key.cmd === "ESCAPED|-- FN: ON") return keyboard.modifiers.fn;
  const sticky = keyboard.isStickyModifierKey(key);
  if (sticky) return keyboard.modifiers[sticky];
  return false;
}

// Resalta en el teclado virtual la tecla que corresponde a lo que se tipeó en el
// teclado físico — igual que findKey() en el original: solo feedback visual/sonoro,
// la escritura real en la terminal la maneja xterm.js directamente (no pasa por
// pressKey()). Como en el original, la precisión depende de que el layout de teclado
// del sistema operativo coincida con el layout elegido acá — no hay forma de leer el
// layout físico real del SO desde el navegador/WebView.
const physicalActiveKeys = ref<Set<KeyDef>>(new Set());

function isPhysicallyActive(key: KeyDef): boolean {
  return physicalActiveKeys.value.has(key);
}

function findPhysicalMatches(event: KeyboardEvent): KeyDef[] {
  const allKeys = Object.values(layoutStore.current ?? {}).flat();

  if (event.key === "Enter") return allKeys.filter((k) => k.cmd === "\r");
  if (event.code === "ShiftLeft") {
    return allKeys.filter((k) => k.cmd === "ESCAPED|-- SHIFT: LEFT");
  }
  if (event.code === "ShiftRight") {
    return allKeys.filter((k) => k.cmd === "ESCAPED|-- SHIFT: RIGHT");
  }
  if (event.code === "ControlLeft") {
    return allKeys.filter((k) => k.cmd === "ESCAPED|-- CTRL: LEFT");
  }
  if (event.code === "ControlRight") {
    return allKeys.filter((k) => k.cmd === "ESCAPED|-- CTRL: RIGHT");
  }
  if (event.code === "AltRight") return allKeys.filter((k) => k.cmd === "ESCAPED|-- ALT: RIGHT");
  if (event.key === "CapsLock") return allKeys.filter((k) => k.cmd === "ESCAPED|-- CAPSLCK: ON");
  if (event.key === "ArrowUp") {
    return allKeys.filter((k) => k.name === "ESCAPED|-- ICON: ARROW_UP");
  }
  if (event.key === "ArrowDown") {
    return allKeys.filter((k) => k.name === "ESCAPED|-- ICON: ARROW_DOWN");
  }
  if (event.key === "ArrowLeft") {
    return allKeys.filter((k) => k.name === "ESCAPED|-- ICON: ARROW_LEFT");
  }
  if (event.key === "ArrowRight") {
    return allKeys.filter((k) => k.name === "ESCAPED|-- ICON: ARROW_RIGHT");
  }

  const SPECIAL_KEYS: Record<string, string> = {
    Tab: "\t",
    Backspace: "\b",
    Escape: CTRL_SEQUENCES[1],
  };
  const mapped = SPECIAL_KEYS[event.key];
  if (mapped !== undefined) return allKeys.filter((k) => k.cmd === mapped);

  if (event.key.length === 1) {
    // El navegador ya resuelve la combinación de modificadores al carácter real
    // (mayúscula con Shift, símbolo con AltGr, etc.), así que alcanza con buscar ese
    // carácter en cualquiera de los campos de la tecla — sin necesidad de replicar acá
    // la lógica de qué modificador está activo.
    return allKeys.filter(
      (k) =>
        k.cmd === event.key ||
        k.shiftCmd === event.key ||
        k.altCmd === event.key ||
        k.altShiftCmd === event.key ||
        k.capsLckCmd === event.key,
    );
  }
  return allKeys.filter((k) => k.fnName === event.key); // F1-F12
}

function handlePhysicalKeydown(event: KeyboardEvent): void {
  for (const key of findPhysicalMatches(event)) physicalActiveKeys.value.add(key);
}

function handlePhysicalKeyup(event: KeyboardEvent): void {
  for (const key of findPhysicalMatches(event)) physicalActiveKeys.value.delete(key);
}

function keyClasses(key: KeyDef) {
  return {
    keyboard_spacebar: key.cmd === " ",
    keyboard_enter: key.cmd === "\r",
    active: isToggleActive(key) || isPhysicallyActive(key),
  };
}

onMounted(async () => {
  const settings = await readSettings().catch(() => null);
  await layoutStore.applyLayoutById(settings?.keyboard ?? "en-US").catch(() => {});

  stage.value = "animation_state_1";
  audioManager.keyboard.play();
  await new Promise((resolve) => setTimeout(resolve, 100));
  stage.value = "animation_state_1 animation_state_2";
});

function handleGlobalKeydown(event: KeyboardEvent): void {
  // Atajo por defecto de shortcuts.json (Ctrl+Shift+P) para el modo contraseña: oculta
  // el sonido de cada tecla y atenúa el teclado, para no filtrar por audio ni por
  // vista la longitud de lo que se está escribiendo.
  if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "p") {
    event.preventDefault();
    keyboard.togglePasswordMode();
    return;
  }
  // En modo contraseña tampoco se resalta la tecla física presionada — mismo motivo
  // que silenciar el sonido: no filtrar por UI qué se está escribiendo.
  if (keyboard.passwordMode.value) return;
  handlePhysicalKeydown(event);
}
// captura=true: xterm.js corta la propagación de los keydown que maneja en su
// <textarea> interno (fase de burbuja) — con la terminal enfocada, que es el caso más
// común de uso real, un listener en window sin captura nunca recibiría el evento. En
// fase de captura este handler corre ANTES de que el evento llegue al textarea.
onMounted(() => {
  window.addEventListener("keydown", handleGlobalKeydown, true);
  window.addEventListener("keyup", handlePhysicalKeyup, true);
});
onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleGlobalKeydown, true);
  window.removeEventListener("keyup", handlePhysicalKeyup, true);
});
</script>

<template>
  <div
    v-for="[rowId, row] in rows"
    :key="rowId"
    class="keyboard_row"
    :class="[
      stage,
      { keyboard_row_space: rowId === 'row_space', password_mode: keyboard.passwordMode.value },
    ]"
  >
    <div
      v-for="(key, i) in row"
      :key="i"
      class="keyboard_key"
      :class="keyClasses(key)"
      :title="key.name"
      @mousedown.prevent="keyboard.pressKey(key)"
    >
      <h5>{{ cornerTopRight(key) }}</h5>
      <h3>{{ cornerBottomRight(key) }}</h3>
      <h2>{{ cornerTopLeft(key) }}</h2>
      <h1>{{ primaryText(key) }}</h1>
    </div>
  </div>
</template>

<style scoped>
.keyboard_row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  flex-wrap: nowrap;
  margin: 0.46vh 0;
  height: 5.28vh;
}
.keyboard_row_space {
  position: relative;
  left: 2.4vh;
}
.keyboard_row.password_mode {
  opacity: 0.5;
  cursor: none;
}

/* Animación de "encendido" del teclado en la secuencia de arranque: primero se
   colapsa todo a ancho 0 con un brillo alto (animation_state_1), después cada fila se
   expande a su ancho real con un pequeño desfase entre filas y el brillo vuelve a lo
   normal (animation_state_2) — mismo efecto tipo neón del original. */
.keyboard_row.animation_state_1 {
  filter: brightness(170%);
  width: 0;
  overflow: hidden;
}
.keyboard_row.animation_state_2 {
  filter: brightness(100%);
  width: 100%;
  overflow: hidden;
  transition:
    width 0.7s cubic-bezier(0.4, 0, 1, 1) 0.2s,
    filter 0.1s linear 0.6s;
}
.keyboard_row.animation_state_2:nth-child(1) {
  transition-delay: 0.3s, 0.8s;
}
.keyboard_row.animation_state_2:nth-child(3) {
  transition-delay: 0s, 0.5s;
}
.keyboard_row.animation_state_2:nth-child(4) {
  transition-delay: 0.25s, 0.8s;
}

.keyboard_key {
  height: 2.7vw;
  min-width: 2.7vw;
  overflow: hidden;
  border-radius: 0.46vh;
  background-color: rgba(var(--color_r), var(--color_g), var(--color_b), 0);
  border: 0.18vh solid rgba(var(--color_r), var(--color_g), var(--color_b), 0);
  margin: 0 0.46vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: pointer;
  user-select: none;
}
.keyboard_key:hover {
  background-color: rgba(var(--color_r), var(--color_g), var(--color_b), 0.25);
}
.keyboard_row.password_mode .keyboard_key:hover {
  background-color: transparent;
}
.keyboard_key:active,
.keyboard_key.active {
  background-color: rgb(var(--color_r), var(--color_g), var(--color_b));
  color: var(--color_black);
}

.keyboard_row:not(:nth-child(4)):not(:last-child) > .keyboard_key:last-child,
.keyboard_row > .keyboard_key:first-child {
  width: 8.33vh;
  min-width: 8.33vh;
}

.keyboard_key h1 {
  margin: 0;
  padding: 0;
  font-size: 1.85vh;
  font-weight: normal;
}
.keyboard_key h2,
.keyboard_key h3,
.keyboard_key h5 {
  margin: 0;
  padding: 0;
  position: absolute;
  font-size: 1.1vh;
  opacity: 0.65;
  font-weight: normal;
}
.keyboard_key h2 {
  top: 0.278vh;
  left: 0.278vh;
}
.keyboard_key h3 {
  bottom: 0.278vh;
  right: 0.278vh;
}
.keyboard_key h5 {
  top: 0.278vh;
  right: 0.278vh;
}
.keyboard_key.active h1,
.keyboard_key.active h2,
.keyboard_key.active h3,
.keyboard_key.active h5 {
  color: var(--color_black);
}

.keyboard_key.keyboard_spacebar {
  width: 47.68vh;
  min-width: 47.68vh;
  height: 3.52vh;
  border: 0.19vh solid rgba(var(--color_r), var(--color_g), var(--color_b), 0.5);
}

.keyboard_key.keyboard_enter {
  width: 9.72vh;
  min-width: 9.72vh;
  border: 0.19vh solid rgba(var(--color_r), var(--color_g), var(--color_b), 0.5);
}
</style>
