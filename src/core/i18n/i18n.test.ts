import { describe, expect, it } from "vitest";
import en from "./locales/en.json";
import es from "./locales/es.json";

function flattenKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return flattenKeys(value as Record<string, unknown>, path);
    }
    return [path];
  });
}

// Un locale con menos claves que el otro no falla en tiempo de build (vue-i18n cae al
// fallbackLocale en runtime, silenciosamente) — este test es la única red que atrapa
// una traducción olvidada antes de que llegue a producción.
describe("locales en/es", () => {
  it("tienen exactamente el mismo conjunto de claves", () => {
    const enKeys = flattenKeys(en).sort();
    const esKeys = flattenKeys(es).sort();
    expect(esKeys).toEqual(enKeys);
  });

  it("no tienen valores vacíos", () => {
    for (const [locale, messages] of [
      ["en", en],
      ["es", es],
    ] as const) {
      for (const key of flattenKeys(messages)) {
        const value = key.split(".").reduce<unknown>((acc, part) => {
          if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[part];
          return undefined;
        }, messages);
        expect(value, `${locale}.${key}`).not.toBe("");
      }
    }
  });
});
