import { z } from "zod";

const cssColor = z.string().min(1);
const byteChannel = z.number().int().min(0).max(255);

const ansiPaletteSchema = z.object({
  red: cssColor.optional(),
  green: cssColor.optional(),
  yellow: cssColor.optional(),
  blue: cssColor.optional(),
  magenta: cssColor.optional(),
  cyan: cssColor.optional(),
  white: cssColor.optional(),
  brightRed: cssColor.optional(),
  brightGreen: cssColor.optional(),
  brightYellow: cssColor.optional(),
  brightBlue: cssColor.optional(),
  brightMagenta: cssColor.optional(),
  brightCyan: cssColor.optional(),
  brightWhite: cssColor.optional(),
});

export const themeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  colors: z.object({
    accentR: byteChannel,
    accentG: byteChannel,
    accentB: byteChannel,
    black: cssColor,
    lightBlack: cssColor,
    grey: cssColor,
    ansi: ansiPaletteSchema.optional(),
  }),
  fonts: z.object({
    main: z.string().min(1),
    mainLight: z.string().min(1),
    mono: z.string().min(1),
  }),
  terminal: z.object({
    cursorStyle: z.enum(["block", "underline", "bar"]),
    foreground: cssColor,
    background: cssColor,
    cursor: cssColor,
    cursorAccent: cssColor.optional(),
    selection: cssColor,
    colorFilter: z.array(z.string()).optional(),
  }),
  globe: z.object({
    base: cssColor,
    marker: cssColor,
    pin: cssColor,
    satellite: cssColor,
  }),
});

export type DarkwindTheme = z.infer<typeof themeSchema>;
