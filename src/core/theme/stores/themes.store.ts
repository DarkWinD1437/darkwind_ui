import { defineStore } from "pinia";
import { themeSchema, type DarkwindTheme } from "../theme.schema";
import { applyTheme } from "../themeEngine";
import { listThemes, readTheme } from "../themeRepository";

export const useThemesStore = defineStore("themes", {
  state: () => ({
    current: null as DarkwindTheme | null,
    available: [] as string[],
  }),
  actions: {
    async refreshAvailable() {
      this.available = await listThemes();
    },
    async applyThemeById(id: string) {
      const raw = await readTheme(id);
      const theme = themeSchema.parse(raw);
      await applyTheme(theme);
      this.current = theme;
    },
  },
});
