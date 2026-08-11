import { defineStore } from "pinia";

export type MediaKind = "audio" | "video";

export const useMediaPlayerStore = defineStore("mediaPlayer", {
  state: () => ({
    path: null as string | null,
    kind: "audio" as MediaKind,
  }),
  actions: {
    open(path: string, kind: MediaKind): void {
      this.path = path;
      this.kind = kind;
    },
    close(): void {
      this.path = null;
    },
  },
});
