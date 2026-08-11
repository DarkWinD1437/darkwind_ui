import { defineStore } from "pinia";
import { readShortcuts, writeShortcuts } from "@/core/persistence/shortcutsRepository";
import type { Shortcut } from "@/core/persistence/types";

export const useShortcutsStore = defineStore("shortcuts", {
  state: () => ({
    list: [] as Shortcut[],
    loaded: false,
  }),
  actions: {
    async load(): Promise<void> {
      // Si shortcuts_read llegara a resolver con algo que no es un array (JSON
      // corrupto en el archivo, mock de test incompleto, etc.) sin llegar a
      // *rechazar* la promesa, `list` quedaría en un estado no-array — y como
      // useGlobalShortcuts.ts corre `list.find(...)` en CADA keydown, un solo valor
      // inválido acá rompería TODOS los atajos de la app en silencio, no solo la
      // carga inicial.
      const result = await readShortcuts();
      this.list = Array.isArray(result) ? result : [];
      this.loaded = true;
    },
    // Persiste la lista completa y actualiza el estado en memoria en el mismo paso —
    // useGlobalShortcuts.ts lee siempre de `this.list`, así que un shortcut recién
    // reasignado/deshabilitado en el editor queda activo de inmediato, sin reiniciar.
    async save(next: Shortcut[]): Promise<void> {
      await writeShortcuts(next);
      this.list = next;
    },
  },
});
