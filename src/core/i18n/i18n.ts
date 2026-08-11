import { createI18n } from "vue-i18n";
import { locale as osLocale } from "@tauri-apps/plugin-os";
import en from "./locales/en.json";
import es from "./locales/es.json";

export type AppLocale = "en" | "es";

// El original nunca tuvo interfaz traducible (todo el texto de _renderer.js/las 17
// clases estaba hardcodeado en inglés) — el boot log (Sección 15 #11) queda fuera a
// propósito, es "lore" del proyecto, no UI funcional.
export const i18n = createI18n({
  legacy: false,
  locale: "es",
  fallbackLocale: "en",
  messages: { en, es },
});

export function setLocale(locale: AppLocale): void {
  i18n.global.locale.value = locale;
}

// Settings.language === "auto" (default de fábrica) resuelve acá contra el idioma
// real del sistema operativo en vez de contra navigator.language (que en el WebView2
// de Tauri no siempre refleja el idioma de Windows configurado por el usuario). Un
// valor explícito ("en"/"es", elegido a mano en SettingsModal) nunca vuelve a pasar
// por acá.
export async function detectSystemLocale(): Promise<AppLocale> {
  try {
    const raw = await osLocale();
    return raw?.toLowerCase().startsWith("es") ? "es" : "en";
  } catch {
    return "en";
  }
}

export async function resolveLocale(languageSetting: string): Promise<AppLocale> {
  if (languageSetting === "en" || languageSetting === "es") return languageSetting;
  return detectSystemLocale();
}
