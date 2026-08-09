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
