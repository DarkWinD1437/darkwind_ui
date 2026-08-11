import { onBeforeUnmount, onMounted } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { useShortcutsStore } from "../stores/shortcuts.store";
import { useTerminalsStore } from "@/features/terminal/stores/terminals.store";
import { dispatchShortcutAction } from "./useShortcutActions";

function keyLabel(event: KeyboardEvent): string | null {
  const key = event.key;
  if (key === "Control" || key === "Shift" || key === "Alt" || key === "Meta") return null;
  if (key === " ") return "Space";
  return key.length === 1 ? key.toUpperCase() : key;
}

// Mismo orden de modificadores que usan los triggers guardados en shortcuts.json
// (Ctrl, Shift, Alt — ver default_shortcuts() en settings.rs, ej. "Ctrl+Shift+Alt+Space").
export function eventToTriggerString(event: KeyboardEvent): string | null {
  const label = keyLabel(event);
  if (!label) return null;
  const parts: string[] = [];
  if (event.ctrlKey) parts.push("Ctrl");
  if (event.shiftKey) parts.push("Shift");
  if (event.altKey) parts.push("Alt");
  parts.push(label);
  return parts.join("+");
}

// Dispatcher genérico de shortcuts.json — reemplaza los listeners hardcodeados que
// cada feature tenía por separado en la Fase 4 (FuzzyFinderModal, FilesystemPanel,
// KeyboardPanel: cada uno con su propio "Ctrl+Shift+F"/"L"/"H"/"P" fijo en el código).
// Ahora hay UN solo listener en captura a nivel de AppShell que lee la lista real
// (editable desde ShortcutsModal) y despacha por nombre de acción — deshabilitar o
// reasignar un atajo en el editor cambia el comportamiento real de inmediato.
export function useGlobalShortcuts(): void {
  const shortcutsStore = useShortcutsStore();
  const terminalsStore = useTerminalsStore();

  function handleKeydown(event: KeyboardEvent): void {
    const trigger = eventToTriggerString(event);
    if (!trigger) return;
    const shortcut = shortcutsStore.list.find((s) => s.enabled && s.trigger === trigger);
    if (!shortcut) return;

    if (shortcut.type === "app") {
      if (dispatchShortcutAction(shortcut.action)) event.preventDefault();
      return;
    }

    // type === "shell": envía el comando a la pestaña activa (ej. el atajo "neofetch",
    // deshabilitado por defecto) — mismo mecanismo que ya usa FuzzyFinderModal para
    // insertar una ruta en la terminal.
    const ptyId = terminalsStore.activeTab?.ptyId;
    if (ptyId) {
      event.preventDefault();
      void invoke("pty_write", { id: ptyId, data: `${shortcut.action}\r` });
    }
  }

  // captura=true: xterm.js corta la propagación de keydown en fase de burbuja con la
  // terminal enfocada — mismo motivo que el resto de los atajos globales de la app.
  onMounted(async () => {
    if (!shortcutsStore.loaded) await shortcutsStore.load().catch(() => {});
    window.addEventListener("keydown", handleKeydown, true);
  });
  onBeforeUnmount(() => window.removeEventListener("keydown", handleKeydown, true));
}
