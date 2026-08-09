import ColorLib from "color";
import type { ITheme } from "@xterm/xterm";
import type { DarkwindTheme } from "@/core/theme/theme.schema";

// Paleta ANSI de referencia (estilo Tango) usada cuando un tema no define overrides en
// colors.ansi — la mayoría de los 9 temas base portados no traen paleta ANSI propia.
const DEFAULT_ANSI = {
  red: "#cc0000",
  green: "#4e9a06",
  yellow: "#c4a000",
  blue: "#3465a4",
  magenta: "#75507b",
  cyan: "#06989a",
  white: "#d3d7cf",
  brightRed: "#ef2929",
  brightGreen: "#8ae234",
  brightYellow: "#fce94f",
  brightBlue: "#729fcf",
  brightMagenta: "#ad7fa8",
  brightCyan: "#34e2e2",
  brightWhite: "#eeeeec",
} as const;

// Misma semántica que el pipeline de color-filter del original: una lista de
// transformaciones nombradas que se aplican en cadena sobre cada color de la paleta.
// Ningún tema portado usa esto todavía (theme.terminal.colorFilter es opcional), pero
// queda cableado para cuando se agregue un tema que lo necesite.
function applyColorFilters(hex: string, filters: string[]): string {
  let color = ColorLib(hex);
  for (const filter of filters) {
    switch (filter) {
      case "negate":
        color = color.negate();
        break;
      case "grayscale":
        color = color.grayscale();
        break;
      case "lighten":
        color = color.lighten(0.2);
        break;
      case "darken":
        color = color.darken(0.2);
        break;
      case "saturate":
        color = color.saturate(0.2);
        break;
      case "desaturate":
        color = color.desaturate(0.2);
        break;
      default:
        break;
    }
  }
  return color.hex();
}

export function buildXtermTheme(theme: DarkwindTheme): ITheme {
  const filters = theme.terminal.colorFilter ?? [];
  const withFilters = (hex: string): string =>
    filters.length > 0 ? applyColorFilters(hex, filters) : hex;

  const ansi = theme.colors.ansi;

  return {
    foreground: withFilters(theme.terminal.foreground),
    background: withFilters(theme.terminal.background),
    cursor: withFilters(theme.terminal.cursor),
    cursorAccent: theme.terminal.cursorAccent
      ? withFilters(theme.terminal.cursorAccent)
      : undefined,
    selectionBackground: theme.terminal.selection,
    black: withFilters(theme.colors.black),
    brightBlack: withFilters(theme.colors.grey),
    red: withFilters(ansi?.red ?? DEFAULT_ANSI.red),
    green: withFilters(ansi?.green ?? DEFAULT_ANSI.green),
    yellow: withFilters(ansi?.yellow ?? DEFAULT_ANSI.yellow),
    blue: withFilters(ansi?.blue ?? DEFAULT_ANSI.blue),
    magenta: withFilters(ansi?.magenta ?? DEFAULT_ANSI.magenta),
    cyan: withFilters(ansi?.cyan ?? DEFAULT_ANSI.cyan),
    white: withFilters(ansi?.white ?? DEFAULT_ANSI.white),
    brightRed: withFilters(ansi?.brightRed ?? DEFAULT_ANSI.brightRed),
    brightGreen: withFilters(ansi?.brightGreen ?? DEFAULT_ANSI.brightGreen),
    brightYellow: withFilters(ansi?.brightYellow ?? DEFAULT_ANSI.brightYellow),
    brightBlue: withFilters(ansi?.brightBlue ?? DEFAULT_ANSI.brightBlue),
    brightMagenta: withFilters(ansi?.brightMagenta ?? DEFAULT_ANSI.brightMagenta),
    brightCyan: withFilters(ansi?.brightCyan ?? DEFAULT_ANSI.brightCyan),
    brightWhite: withFilters(ansi?.brightWhite ?? DEFAULT_ANSI.brightWhite),
  };
}
