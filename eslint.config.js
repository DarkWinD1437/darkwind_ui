import js from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginVue from "eslint-plugin-vue";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
  { ignores: ["dist/**", "src-tauri/**", "node_modules/**", "**/*.d.ts"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs["flat/recommended"],
  {
    files: ["src/**/*.{ts,vue}"],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ["**/*.vue"],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  {
    // Portado mecánicamente desde el eDEX-UI original (tabla generada de ~2400 reglas
    // regex, un match de tipo de archivo por línea) — no vale la pena limpiar a mano
    // miles de líneas de código ya generado por otra herramienta.
    files: ["src/features/filesystem/fileIconsMatcher.ts"],
    rules: {
      "@typescript-eslint/ban-ts-comment": "off",
      "no-useless-escape": "off",
    },
  },
  eslintConfigPrettier,
);
