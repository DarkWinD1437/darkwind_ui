import { defineStore } from "pinia";
import { readSettings, writeSettings } from "@/core/persistence/settingsRepository";
import type { Settings } from "@/core/persistence/types";
import { audioManager } from "@/core/audio/audioManager";
import { resolveLocale, setLocale } from "@/core/i18n/i18n";
import { useThemesStore } from "@/core/theme/stores/themes.store";
import { useKeyboardStore } from "@/features/keyboard/stores/keyboard.store";

// Primer store que envuelve settings_read/settings_write de forma centralizada — hasta
// la Fase 4 cada componente que necesitaba tocar un campo (FilesystemPanel con
// fsListView/hideDotfiles, KeyboardPanel con el layout) hacía su propio
// read-modify-write suelto contra el repository. SettingsModal es el primer lugar que
// necesita editar CUALQUIER campo a la vez, así que centralizar acá evita duplicar esa
// lógica de merge en el componente del formulario.
export const useSettingsStore = defineStore("settings", {
  state: () => ({
    current: null as Settings | null,
  }),
  actions: {
    async load(): Promise<Settings> {
      this.current = await readSettings();
      return this.current;
    },
    async update(patch: Partial<Settings>): Promise<void> {
      const base = this.current ?? (await this.load());
      const next: Settings = { ...base, ...patch };
      await writeSettings(next);
      this.current = next;
      await this.applySideEffects(patch, next);
    },
    // Aplica en caliente los campos que otro store/singleton necesita reflejar de
    // inmediato — sin esto, cambiar el tema/idioma/audio en Settings requeriría
    // reiniciar la app para surtir efecto, algo que el original tampoco resolvía bien
    // (lee settings con require() cacheado, Sección 6.6 del plan).
    async applySideEffects(patch: Partial<Settings>, next: Settings): Promise<void> {
      const tasks: Promise<unknown>[] = [];
      if (patch.theme !== undefined) {
        tasks.push(useThemesStore().applyThemeById(next.theme));
      }
      if (patch.keyboard !== undefined) {
        tasks.push(useKeyboardStore().applyLayoutById(next.keyboard));
      }
      if (patch.language !== undefined) {
        tasks.push(resolveLocale(next.language).then(setLocale));
      }
      if (patch.audio !== undefined || patch.audioVolume !== undefined || patch.disableFeedbackAudio !== undefined) {
        audioManager.configure({
          enabled: next.audio,
          volume: next.audioVolume,
          feedbackEnabled: !next.disableFeedbackAudio,
        });
      }
      await Promise.all(tasks);
    },
  },
});
