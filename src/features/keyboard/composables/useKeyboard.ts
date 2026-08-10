import { reactive, ref } from "vue";
import type { KeyDef, KeyboardLayout } from "../keyboard.schema";
import { DEAD_KEY_TRANSFORMS, ESCAPED_PREFIX, resolveControlSequences } from "../deadKeys";
import type { DeadKeyName } from "../deadKeys";

export interface KeyboardModifiers {
  shift: boolean;
  capsLock: boolean;
  ctrl: boolean;
  alt: boolean;
  fn: boolean;
}

const DEAD_KEY_NAMES = new Set<string>([
  "CIRCUM",
  "TREMA",
  "ACUTE",
  "GRAVE",
  "CARON",
  "BAR",
  "BREVE",
  "TILDE",
  "MACRON",
  "CEDILLA",
  "OVERRING",
  "GREEK",
  "IOTASUB",
]);

// Resuelve los placeholders "~~~CTRLSEQ<n>~~~" de todos los campos del layout una
// sola vez al cargarlo, en vez de en cada pulsación — mismo momento (carga del
// layout) en el que el original hacía este reemplazo.
export function resolveLayoutControlSequences(layout: KeyboardLayout): KeyboardLayout {
  const resolved: KeyboardLayout = {};
  for (const [rowId, keys] of Object.entries(layout)) {
    resolved[rowId] = keys.map((key) => {
      const copy = { ...key } as Record<string, string>;
      for (const field of Object.keys(copy)) {
        copy[field] = resolveControlSequences(copy[field]);
      }
      return copy as unknown as KeyDef;
    });
  }
  return resolved;
}

export interface UseKeyboardOptions {
  writeToTerminal: (data: string) => void;
  playKeySound?: () => void;
  playEnterSound?: () => void;
  // Igual que window.keyboard.linkedToTerm en el original: cuando un modal con su
  // propio input toma el foco (ej. FuzzyFinder), el teclado táctil se "desconecta" de
  // la terminal activa y en vez de eso edita el elemento con foco. Se recibe como
  // función (en vez de que el composable posea el estado) para que el flag pueda
  // vivir en un store compartido con otros componentes que necesitan togglearlo.
  isLinkedToTerm?: () => boolean;
}

export function useKeyboard(options: UseKeyboardOptions) {
  const modifiers = reactive<KeyboardModifiers>({
    shift: false,
    capsLock: false,
    ctrl: false,
    alt: false,
    fn: false,
  });
  const pendingDeadKey = ref<DeadKeyName | null>(null);
  const passwordMode = ref(false);
  const isLinkedToTerm = options.isLinkedToTerm ?? (() => true);

  function togglePasswordMode(): boolean {
    passwordMode.value = !passwordMode.value;
    return passwordMode.value;
  }

  // Aplica la precedencia exacta del original: shift/capslock primero, capslock
  // vuelve a pisar si la tecla tiene un valor específico para capslock (letras
  // acentuadas en layouts AZERTY, ej. fr-FR), después ctrl, alt, alt+shift, fn, y
  // recién al final el dead-key pendiente (si lo hay) transforma el resultado.
  function resolveCmd(key: KeyDef): string {
    let cmd = key.cmd;
    if ((modifiers.shift || modifiers.capsLock) && key.shiftCmd) cmd = key.shiftCmd;
    if (modifiers.capsLock && key.capsLckCmd) cmd = key.capsLckCmd;
    if (modifiers.ctrl && key.ctrlCmd) cmd = key.ctrlCmd;
    if (modifiers.alt && key.altCmd) cmd = key.altCmd;
    if (modifiers.alt && modifiers.shift && key.altShiftCmd) cmd = key.altShiftCmd;
    if (modifiers.fn && key.fnCmd) cmd = key.fnCmd;

    if (pendingDeadKey.value) {
      cmd = DEAD_KEY_TRANSFORMS[pendingDeadKey.value](cmd);
      pendingDeadKey.value = null;
    }
    return cmd;
  }

  // Las teclas Shift/Ctrl/Alt (izq. y der.) no pasan por resolveCmd/pressKey: son
  // "sticky" — un tap las prende, otro tap las apaga, sin auto-repetición. Se
  // detectan por su cmd fijo (nunca tienen variantes por modificador).
  function isStickyModifierKey(key: KeyDef): "shift" | "ctrl" | "alt" | null {
    if (!key.cmd.startsWith(ESCAPED_PREFIX)) return null;
    const action = key.cmd.slice(ESCAPED_PREFIX.length);
    if (action.startsWith("SHIFT:")) return "shift";
    if (action.startsWith("CTRL:")) return "ctrl";
    if (action.startsWith("ALT:")) return "alt";
    return null;
  }

  function pressKey(key: KeyDef): void {
    const sticky = isStickyModifierKey(key);
    if (sticky) {
      modifiers[sticky] = !modifiers[sticky];
      return;
    }

    const cmd = resolveCmd(key);

    if (cmd.startsWith(ESCAPED_PREFIX)) {
      const action = cmd.slice(ESCAPED_PREFIX.length);
      if (action === "CAPSLCK: ON") {
        modifiers.capsLock = true;
        return;
      }
      if (action === "CAPSLCK: OFF") {
        modifiers.capsLock = false;
        return;
      }
      if (action === "FN: ON") {
        modifiers.fn = true;
        return;
      }
      if (action === "FN: OFF") {
        modifiers.fn = false;
        return;
      }
      if (DEAD_KEY_NAMES.has(action)) {
        pendingDeadKey.value = action as DeadKeyName;
        return;
      }
      // Otros placeholders (ICON:, etc.) no producen ninguna escritura.
      return;
    }

    if (cmd === "\n") {
      if (isLinkedToTerm()) options.writeToTerminal("\r\n");
      return;
    }

    if (cmd === "\r") {
      options.playEnterSound?.();
    } else if (!passwordMode.value) {
      options.playKeySound?.();
    }

    if (isLinkedToTerm()) {
      options.writeToTerminal(cmd);
      return;
    }

    writeToFocusedElement(cmd);
  }

  // Cuando el teclado no está enlazado a la terminal (ej. un <input> de un modal tiene
  // el foco), edita ese elemento directamente en vez de escribir en la shell — mismo
  // comportamiento que el bloque "else" de pressKey() en el original.
  function writeToFocusedElement(cmd: string): void {
    const el = document.activeElement;
    if (!(el instanceof HTMLInputElement) && !(el instanceof HTMLTextAreaElement)) return;

    switch (cmd) {
      case "":
        el.value = el.value.slice(0, -1);
        break;
      case "OD":
        if (el.selectionStart !== null) {
          el.selectionStart -= 1;
          el.selectionEnd = el.selectionStart;
        }
        break;
      case "OC":
        if (el.selectionEnd !== null) {
          el.selectionEnd += 1;
          el.selectionStart = el.selectionEnd;
        }
        break;
      default:
        // No se insertan secuencias de control sueltas (flechas/Esc no mapeadas arriba).
        if (cmd.length === 1 && cmd.charCodeAt(0) < 0x20) break;
        el.value += cmd;
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }

  return {
    modifiers,
    pendingDeadKey,
    passwordMode,
    togglePasswordMode,
    pressKey,
    isStickyModifierKey,
  };
}
