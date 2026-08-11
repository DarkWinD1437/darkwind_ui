import { defineStore } from "pinia";

// El original nunca tuvo un visor de PDF integrado — docReader.class.js sí, pero acá
// se resuelve con un store propio en vez de un window.* global, mismo patrón que el
// resto de la app (filesystem.store, keyboard.store, etc.).
export const useDocReaderStore = defineStore("docReader", {
  state: () => ({
    path: null as string | null,
  }),
  actions: {
    open(path: string): void {
      this.path = path;
    },
    close(): void {
      this.path = null;
    },
  },
});
