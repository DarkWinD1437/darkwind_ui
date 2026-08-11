// Registro central de acciones disparables por shortcut.json — reemplaza a
// window.useAppShortcut() del original (un switch gigante hardcodeado). Cualquier
// feature se registra con el nombre de acción que ya usan los shortcuts por defecto
// (Sección settings.rs::default_shortcuts) sin que useGlobalShortcuts.ts necesite
// conocer de antemano qué hace cada una.
const handlers = new Map<string, () => void>();

export function registerShortcutAction(action: string, handler: () => void): () => void {
  handlers.set(action, handler);
  return () => {
    if (handlers.get(action) === handler) handlers.delete(action);
  };
}

// Devuelve false si la acción no tiene (todavía) una función real asociada — algunas
// de las 14 acciones por defecto (COPY, PASTE, NEXT_TAB, ...) quedan reservadas para
// una fase posterior; el editor de shortcuts ya permite verlas/reasignarlas/
// deshabilitarlas, pero disparar una sin handler no debe romper nada, solo no-opear.
export function dispatchShortcutAction(action: string): boolean {
  const handler = handlers.get(action);
  if (!handler) return false;
  handler();
  return true;
}
