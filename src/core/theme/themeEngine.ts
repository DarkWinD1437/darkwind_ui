import type { DarkwindTheme } from "./theme.schema";

const fontAssets = import.meta.glob("../../assets/fonts/*.woff2", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

function fontFileName(fontFamily: string): string {
  return fontFamily.toLowerCase().replace(/ /g, "_") + ".woff2";
}

function resolveFontUrl(fontFamily: string): string | undefined {
  const target = fontFileName(fontFamily);
  return Object.entries(fontAssets).find(([filePath]) => filePath.endsWith(target))?.[1];
}

async function loadThemeFonts(theme: DarkwindTheme): Promise<void> {
  const families = [theme.fonts.main, theme.fonts.mainLight, theme.fonts.mono];

  await Promise.all(
    families.map(async (family) => {
      const url = resolveFontUrl(family);
      if (!url) return;
      const face = new FontFace(family, `url("${url}")`);
      document.fonts.add(face);
      await face.load();
    }),
  );
}

// Limpieza extra de seguridad, aunque los valores del tema ya pasaron por Zod antes de llegar acá.
function purifyCss(value: string): string {
  return value.replace(/[<]/g, "");
}

export async function applyTheme(theme: DarkwindTheme): Promise<void> {
  await loadThemeFonts(theme);

  document.querySelector("style.theming")?.remove();

  const style = document.createElement("style");
  style.className = "theming";
  // textContent (no innerHTML) hace que estos valores nunca puedan interpretarse como
  // markup, a diferencia del patrón `document.head.innerHTML += ...` del original.
  style.textContent = `
    :root {
      --font_main: "${purifyCss(theme.fonts.main)}";
      --font_main_light: "${purifyCss(theme.fonts.mainLight)}";
      --font_mono: "${purifyCss(theme.fonts.mono)}";
      --color_r: ${theme.colors.accentR};
      --color_g: ${theme.colors.accentG};
      --color_b: ${theme.colors.accentB};
      --color_black: ${purifyCss(theme.colors.black)};
      --color_light_black: ${purifyCss(theme.colors.lightBlack)};
      --color_grey: ${purifyCss(theme.colors.grey)};
      --color_red: ${purifyCss(theme.colors.ansi?.red ?? "red")};
      --color_yellow: ${purifyCss(theme.colors.ansi?.yellow ?? "yellow")};
    }

    body {
      font-family: var(--font_main), sans-serif;
    }
  `;
  document.head.appendChild(style);
}

const UI_SCALE_MIN = 0.85;
const UI_SCALE_MAX = 1.4;

// Probado primero con `zoom` en :root (recalcula el viewport completo, como el zoom
// nativo del navegador) — se descartó porque AppShell tiene varios `h3.title` en
// position:fixed dentro del árbol zoomeado (ver comentario sobre augmented-ui +
// fixed en themeRepository/AppShell), y el motor Chromium de WebView2 no reposiciona
// esos fixed en sincronía con el resto: a partir de ~110% el layout se desarmaba
// (columnas y paneles quedaban desalineados en vez de crecer juntos). En su lugar,
// cada `font-size: Xvh` explícito del proyecto quedó envuelto en
// `calc(Xvh * var(--ui-font-scale, 1))` — solo el tamaño del texto cambia, nunca el
// tamaño ni la posición de las cajas que lo contienen, así que el layout general
// (grillas, position:fixed/absolute, animaciones) es imposible que se rompa por esto.
export function applyUiScale(scale: number): void {
  const clamped = Math.min(UI_SCALE_MAX, Math.max(UI_SCALE_MIN, scale));
  document.documentElement.style.setProperty("--ui-font-scale", String(clamped));
}
