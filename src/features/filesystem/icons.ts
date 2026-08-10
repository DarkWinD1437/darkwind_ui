// Set curado de íconos propios (geometría simple, no copiados de ninguna librería de
// terceros) para el panel de filesystem. El original (eDEX-UI) usa un set de ~700
// SVGs de Font Awesome (~3 MB) resuelto por matchIcon() en fileIconsMatcher.ts — acá
// se reutiliza esa misma lógica de matching (fiel, portada 1:1) pero se resuelve
// contra un puñado de categorías visuales en vez de un ícono distinto por lenguaje,
// para no sumar varios MB de SVGs de licencia de terceros al instalador. Un nombre de
// ícono sin entrada en MATCH_TO_ICON cae al ícono genérico de archivo, igual que el
// original cuando el nombre devuelto no tiene SVG asociado.
export interface IconDef {
  viewBox: string;
  markup: string;
}

const ICONS = {
  dir: {
    viewBox: "0 0 24 24",
    markup:
      '<path d="M3 5a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5z"/>',
  },
  up: {
    viewBox: "0 0 24 24",
    markup: '<path d="M12 4l7 7h-4v9h-6v-9H5z"/>',
  },
  showDisks: {
    viewBox: "0 0 24 24",
    markup:
      '<ellipse cx="12" cy="5" rx="8" ry="2.5"/><path d="M4 5v6c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5V5"/><path d="M4 11v6c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5v-6" fill="none" stroke="currentColor" stroke-width="1.5"/>',
  },
  disk: {
    viewBox: "0 0 24 24",
    markup:
      '<rect x="3" y="6" width="18" height="12" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" stroke-width="1.4"/><line x1="6" y1="16" x2="9" y2="16" stroke="currentColor" stroke-width="1.4"/>',
  },
  usb: {
    viewBox: "0 0 24 24",
    markup:
      '<rect x="9" y="3" width="6" height="9" rx="1" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 12v4M9 20h6l-1.5-4h-3z" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  },
  file: {
    viewBox: "0 0 24 24",
    markup:
      '<path d="M6 2h7l5 5v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M13 2v5h5" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  },
  other: {
    viewBox: "0 0 24 24",
    markup:
      '<path d="M6 2h7l5 5v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="12" y="17" font-size="8" text-anchor="middle" fill="currentColor">?</text>',
  },
  symlink: {
    viewBox: "0 0 24 24",
    markup:
      '<path d="M6 2h7l5 5v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M9 15l6-6M11 9h4v4" fill="none" stroke="currentColor" stroke-width="1.4"/>',
  },
  code: {
    viewBox: "0 0 24 24",
    markup:
      '<path d="M8 6L2 12l6 6M16 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  markdown: {
    viewBox: "0 0 24 24",
    markup:
      '<rect x="2" y="5" width="20" height="14" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5 16V8l3.5 4L12 8v8M15 8v5m-2-2l2 2 2-2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  image: {
    viewBox: "0 0 24 24",
    markup:
      '<rect x="3" y="4" width="18" height="16" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="M3 17l5.5-5.5L13 16l3-3 5 5" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  },
  audio: {
    viewBox: "0 0 24 24",
    markup:
      '<path d="M9 17V6l10-2v11" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="7" cy="18" r="2.3" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="17" cy="16" r="2.3" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  },
  video: {
    viewBox: "0 0 24 24",
    markup:
      '<rect x="2.5" y="5" width="14" height="14" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M16.5 10l5-3v10l-5-3z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  },
  pdf: {
    viewBox: "0 0 24 24",
    markup:
      '<path d="M6 2h7l5 5v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="12" y="17" font-size="6.5" text-anchor="middle" fill="currentColor">PDF</text>',
  },
  archive: {
    viewBox: "0 0 24 24",
    markup:
      '<rect x="3" y="4" width="18" height="17" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.6"/><line x1="12" y1="4" x2="12" y2="21" stroke="currentColor" stroke-width="1.4" stroke-dasharray="2 2"/><rect x="10" y="8" width="4" height="3" fill="currentColor"/>',
  },
  git: {
    viewBox: "0 0 24 24",
    markup:
      '<circle cx="7" cy="6" r="2.2" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="7" cy="18" r="2.2" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="17" cy="12" r="2.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M7 8.2V18M7 8.2c0 4 3 3.8 8 3.8" fill="none" stroke="currentColor" stroke-width="1.4"/>',
  },
} satisfies Record<string, IconDef>;

export type CuratedIconName = keyof typeof ICONS;

// Nombres devueltos por matchIcon() → categoría curada de arriba. Deliberadamente NO
// exhaustivo (matchIcon conoce cientos de herramientas/lenguajes de nicho) — solo se
// cubren los tipos de archivo más comunes en una carpeta real; el resto cae al ícono
// genérico de archivo, igual que en el original.
const MATCH_TO_ICON: Record<string, CuratedIconName> = {
  js: "code",
  ts: "code",
  vue: "code",
  rust: "code",
  python: "code",
  css3: "code",
  html5: "code",
  json: "code",
  toml: "code",
  svg: "image",
  package: "code",
  database: "code",
  windows: "code",
  markdown: "markdown",
  image: "image",
  audio: "audio",
  video: "video",
  "icon-file-pdf": "pdf",
  zip: "archive",
  git: "git",
};

export function resolveMatchedIcon(matchedName: string | undefined): IconDef {
  if (matchedName) {
    const curated = MATCH_TO_ICON[matchedName];
    if (curated) return ICONS[curated];
  }
  return ICONS.file;
}

export function specialIcon(name: CuratedIconName): IconDef {
  return ICONS[name];
}
