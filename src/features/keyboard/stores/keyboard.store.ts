import { defineStore } from "pinia";
import { keyboardLayoutSchema, type KeyboardLayout } from "../keyboard.schema";
import { listLayouts, readLayout } from "../layoutRepository";
import { resolveLayoutControlSequences } from "../composables/useKeyboard";

export const useKeyboardStore = defineStore("keyboard", {
  state: () => ({
    current: null as KeyboardLayout | null,
    currentId: "" as string,
    available: [] as string[],
    // Igual que window.keyboard.linkedToTerm en el original: cuando un modal con su
    // propio <input> toma el foco (ej. el buscador difuso), el teclado táctil deja de
    // escribir en la terminal activa y en vez de eso edita ese elemento. Vive acá (no
    // en el composable useKeyboard) para que cualquier componente pueda togglearlo sin
    // necesidad de una referencia directa al panel del teclado.
    linkedToTerm: true,
  }),
  actions: {
    async refreshAvailable() {
      this.available = await listLayouts();
    },
    async applyLayoutById(id: string) {
      const raw = await readLayout(id);
      const layout = keyboardLayoutSchema.parse(raw);
      this.current = resolveLayoutControlSequences(layout);
      this.currentId = id;
    },
    attach() {
      this.linkedToTerm = true;
    },
    detach() {
      this.linkedToTerm = false;
    },
  },
});
