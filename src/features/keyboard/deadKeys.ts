// Portado 1:1 desde keyboard.class.js (eDEX-UI original) — las 13 tablas de
// composición de diacríticos + la lista de secuencias de control que reemplazan a los
// placeholders "~~~CTRLSEQ<n>~~~" de los layouts. La fidelidad de estas tablas es lo
// que valida deadKeys.test.ts.
//
// CORRECCIÓN DELIBERADA sobre el original: el índice 9 (reservado para Ctrl+T) tenía
// "\x12" (que es también el valor de Ctrl+R, índice 6) por un bug de copiar/pegar en
// eDEX-UI — Ctrl+T terminaba mandando el mismo código que Ctrl+R. Acá va el valor
// correcto de Ctrl+T ("\x14").
export const CTRL_SEQUENCES = [
  "",
  "\x1B", // 1: Esc
  "\x1C", // 2: Ctrl+\
  "\x1D", // 3: Ctrl+]
  "\x1E", // 4: Ctrl+^
  "\x1F", // 5: Ctrl+_
  "\x11", // 6: Ctrl+Q
  "\x17", // 7: Ctrl+W
  "\x12", // 8: Ctrl+R
  "\x14", // 9: Ctrl+T (corregido, ver comentario de arriba)
  "\x19", // 10: Ctrl+Y
  "\x15", // 11: Ctrl+U
  "\x10", // 12: Ctrl+P
  "\x01", // 13: Ctrl+A
  "\x13", // 14: Ctrl+S
  "\x04", // 15: Ctrl+D
  "\x06", // 16: Ctrl+F
  "\x1A", // 17: Ctrl+Z
  "\x18", // 18: Ctrl+X
  "\x03", // 19: Ctrl+C
  "\x16", // 20: Ctrl+V
  "\x02", // 21: Ctrl+B
] as const;

// Reemplaza cada placeholder "~~~CTRLSEQ<n>~~~" que pueda aparecer en medio de un
// string más largo (ej. "~~~CTRLSEQ1~~~[15~" → "\x1B[15~", la secuencia ANSI de F5)
// por el carácter de control real — mismo mecanismo que el constructor de
// keyboard.class.js en el original.
export function resolveControlSequences(value: string): string {
  let resolved = value;
  for (let i = 1; i < CTRL_SEQUENCES.length; i++) {
    resolved = resolved.split(`~~~CTRLSEQ${i}~~~`).join(CTRL_SEQUENCES[i]);
  }
  return resolved;
}

export const ESCAPED_PREFIX = "ESCAPED|-- ";

export type DeadKeyName =
  | "CIRCUM"
  | "TREMA"
  | "ACUTE"
  | "GRAVE"
  | "CARON"
  | "BAR"
  | "BREVE"
  | "TILDE"
  | "MACRON"
  | "CEDILLA"
  | "OVERRING"
  | "GREEK"
  | "IOTASUB";

export function addCircum(char: string): string {
  switch (char) {
    case "a":
      return "â";
    case "A":
      return "Â";
    case "z":
      return "ẑ";
    case "Z":
      return "Ẑ";
    case "e":
      return "ê";
    case "E":
      return "Ê";
    case "y":
      return "ŷ";
    case "Y":
      return "Ŷ";
    case "u":
      return "û";
    case "U":
      return "Û";
    case "i":
      return "î";
    case "I":
      return "Î";
    case "o":
      return "ô";
    case "O":
      return "Ô";
    case "s":
      return "ŝ";
    case "S":
      return "Ŝ";
    case "g":
      return "ĝ";
    case "G":
      return "Ĝ";
    case "h":
      return "ĥ";
    case "H":
      return "Ĥ";
    case "j":
      return "ĵ";
    case "J":
      return "Ĵ";
    case "w":
      return "ŵ";
    case "W":
      return "Ŵ";
    case "c":
      return "ĉ";
    case "C":
      return "Ĉ";
    // el circunflejo también se usa para superíndices numéricos
    case "1":
      return "¹";
    case "2":
      return "²";
    case "3":
      return "³";
    case "4":
      return "⁴";
    case "5":
      return "⁵";
    case "6":
      return "⁶";
    case "7":
      return "⁷";
    case "8":
      return "⁸";
    case "9":
      return "⁹";
    case "0":
      return "⁰";
    default:
      return char;
  }
}

export function addTrema(char: string): string {
  switch (char) {
    case "a":
      return "ä";
    case "A":
      return "Ä";
    case "e":
      return "ë";
    case "E":
      return "Ë";
    case "t":
      return "ẗ";
    case "y":
      return "ÿ";
    case "Y":
      return "Ÿ";
    case "u":
      return "ü";
    case "U":
      return "Ü";
    case "i":
      return "ï";
    case "I":
      return "Ï";
    case "o":
      return "ö";
    case "O":
      return "Ö";
    case "h":
      return "ḧ";
    case "H":
      return "Ḧ";
    case "w":
      return "ẅ";
    case "W":
      return "Ẅ";
    case "x":
      return "ẍ";
    case "X":
      return "Ẍ";
    default:
      return char;
  }
}

export function addAcute(char: string): string {
  switch (char) {
    case "a":
      return "á";
    case "A":
      return "Á";
    case "c":
      return "ć";
    case "C":
      return "Ć";
    case "e":
      return "é";
    case "E":
      return "E";
    case "g":
      return "ǵ";
    case "G":
      return "Ǵ";
    case "i":
      return "í";
    case "I":
      return "Í";
    case "j":
      return "ȷ́";
    case "J":
      return "J́";
    case "k":
      return "ḱ";
    case "K":
      return "Ḱ";
    case "l":
      return "ĺ";
    case "L":
      return "Ĺ";
    case "m":
      return "ḿ";
    case "M":
      return "Ḿ";
    case "n":
      return "ń";
    case "N":
      return "Ń";
    case "o":
      return "ó";
    case "O":
      return "Ó";
    case "p":
      return "ṕ";
    case "P":
      return "Ṕ";
    case "r":
      return "ŕ";
    case "R":
      return "Ŕ";
    case "s":
      return "ś";
    case "S":
      return "Ś";
    case "u":
      return "ú";
    case "U":
      return "Ú";
    case "v":
      return "v́";
    case "V":
      return "V́";
    case "w":
      return "ẃ";
    case "W":
      return "Ẃ";
    case "y":
      return "ý";
    case "Y":
      return "Ý";
    case "z":
      return "ź";
    case "Z":
      return "Ź";
    case "ê":
      return "ế";
    case "Ê":
      return "Ế";
    case "ç":
      return "ḉ";
    case "Ç":
      return "Ḉ";
    default:
      return char;
  }
}

export function addGrave(char: string): string {
  switch (char) {
    case "a":
      return "à";
    case "A":
      return "À";
    case "e":
      return "è";
    case "E":
      return "È";
    case "i":
      return "ì";
    case "I":
      return "Ì";
    case "m":
      return "m̀";
    case "M":
      return "M̀";
    case "n":
      return "ǹ";
    case "N":
      return "Ǹ";
    case "o":
      return "ò";
    case "O":
      return "Ò";
    case "u":
      return "ù";
    case "U":
      return "Ù";
    case "v":
      return "v̀";
    case "V":
      return "V̀";
    case "w":
      return "ẁ";
    case "W":
      return "Ẁ";
    case "y":
      return "ỳ";
    case "Y":
      return "Ỳ";
    case "ê":
      return "ề";
    case "Ê":
      return "Ề";
    default:
      return char;
  }
}

export function addCaron(char: string): string {
  switch (char) {
    case "a":
      return "ǎ";
    case "A":
      return "Ǎ";
    case "c":
      return "č";
    case "C":
      return "Č";
    case "d":
      return "ď";
    case "D":
      return "Ď";
    case "e":
      return "ě";
    case "E":
      return "Ě";
    case "g":
      return "ǧ";
    case "G":
      return "Ǧ";
    case "h":
      return "ȟ";
    case "H":
      return "Ȟ";
    case "i":
      return "ǐ";
    case "I":
      return "Ǐ";
    case "j":
      return "ǰ";
    case "k":
      return "ǩ";
    case "K":
      return "Ǩ";
    case "l":
      return "ľ";
    case "L":
      return "Ľ";
    case "n":
      return "ň";
    case "N":
      return "Ň";
    case "o":
      return "ǒ";
    case "O":
      return "Ǒ";
    case "r":
      return "ř";
    case "R":
      return "Ř";
    case "s":
      return "š";
    case "S":
      return "Š";
    case "t":
      return "ť";
    case "T":
      return "Ť";
    case "u":
      return "ǔ";
    case "U":
      return "Ǔ";
    case "z":
      return "ž";
    case "Z":
      return "Ž";
    // el caron también se usa para subíndices numéricos
    case "1":
      return "₁";
    case "2":
      return "₂";
    case "3":
      return "₃";
    case "4":
      return "₄";
    case "5":
      return "₅";
    case "6":
      return "₆";
    case "7":
      return "₇";
    case "8":
      return "₈";
    case "9":
      return "₉";
    case "0":
      return "₀";
    default:
      return char;
  }
}

export function addBar(char: string): string {
  switch (char) {
    case "a":
      return "ⱥ";
    case "A":
      return "Ⱥ";
    case "b":
      return "ƀ";
    case "B":
      return "Ƀ";
    case "c":
      return "ȼ";
    case "C":
      return "Ȼ";
    case "d":
      return "đ";
    case "D":
      return "Đ";
    case "e":
      return "ɇ";
    case "E":
      return "Ɇ";
    case "g":
      return "ǥ";
    case "G":
      return "Ǥ";
    case "h":
      return "ħ";
    case "H":
      return "Ħ";
    case "i":
      return "ɨ";
    case "I":
      return "Ɨ";
    case "j":
      return "ɉ";
    case "J":
      return "Ɉ";
    case "l":
      return "ł";
    case "L":
      return "Ł";
    case "o":
      return "ø";
    case "O":
      return "Ø";
    case "p":
      return "ᵽ";
    case "P":
      return "Ᵽ";
    case "r":
      return "ɍ";
    case "R":
      return "Ɍ";
    case "t":
      return "ŧ";
    case "T":
      return "Ŧ";
    case "u":
      return "ʉ";
    case "U":
      return "Ʉ";
    case "y":
      return "ɏ";
    case "Y":
      return "Ɏ";
    case "z":
      return "ƶ";
    case "Z":
      return "Ƶ";
    default:
      return char;
  }
}

export function addBreve(char: string): string {
  switch (char) {
    case "a":
      return "ă";
    case "A":
      return "Ă";
    case "e":
      return "ĕ";
    case "E":
      return "Ĕ";
    case "g":
      return "ğ";
    case "G":
      return "Ğ";
    case "i":
      return "ĭ";
    case "I":
      return "Ĭ";
    case "o":
      return "ŏ";
    case "O":
      return "Ŏ";
    case "u":
      return "ŭ";
    case "U":
      return "Ŭ";
    case "à":
      return "ằ";
    case "À":
      return "Ằ";
    default:
      return char;
  }
}

export function addTilde(char: string): string {
  switch (char) {
    case "a":
      return "ã";
    case "A":
      return "Ã";
    case "e":
      return "ẽ";
    case "E":
      return "Ẽ";
    case "i":
      return "ĩ";
    case "I":
      return "Ĩ";
    case "n":
      return "ñ";
    case "N":
      return "Ñ";
    case "o":
      return "õ";
    case "O":
      return "Õ";
    case "u":
      return "ũ";
    case "U":
      return "Ũ";
    case "v":
      return "ṽ";
    case "V":
      return "Ṽ";
    case "y":
      return "ỹ";
    case "Y":
      return "Ỹ";
    case "ê":
      return "ễ";
    case "Ê":
      return "Ễ";
    default:
      return char;
  }
}

export function addMacron(char: string): string {
  switch (char) {
    case "a":
      return "ā";
    case "A":
      return "Ā";
    case "e":
      return "ē";
    case "E":
      return "Ē";
    case "g":
      return "ḡ";
    case "G":
      return "Ḡ";
    case "i":
      return "ī";
    case "I":
      return "Ī";
    case "o":
      return "ō";
    case "O":
      return "Ō";
    case "u":
      return "ū";
    case "U":
      return "Ū";
    case "y":
      return "ȳ";
    case "Y":
      return "Ȳ";
    case "é":
      return "ḗ";
    case "É":
      return "Ḗ";
    case "è":
      return "ḕ";
    case "È":
      return "Ḕ";
    default:
      return char;
  }
}

export function addCedilla(char: string): string {
  switch (char) {
    case "c":
      return "ç";
    case "C":
      return "Ç";
    case "d":
      return "ḑ";
    case "D":
      return "Ḑ";
    case "e":
      return "ȩ";
    case "E":
      return "Ȩ";
    case "g":
      return "ģ";
    case "G":
      return "Ģ";
    case "h":
      return "ḩ";
    case "H":
      return "Ḩ";
    case "k":
      return "ķ";
    case "K":
      return "Ķ";
    case "l":
      return "ļ";
    case "L":
      return "Ļ";
    case "n":
      return "ņ";
    case "N":
      return "Ņ";
    case "r":
      return "ŗ";
    case "R":
      return "Ŗ";
    case "s":
      return "ş";
    case "S":
      return "Ş";
    case "t":
      return "ţ";
    case "T":
      return "Ţ";
    default:
      return char;
  }
}

export function addOverring(char: string): string {
  switch (char) {
    case "a":
      return "å";
    case "A":
      return "Å";
    case "u":
      return "ů";
    case "U":
      return "Ů";
    case "w":
      return "ẘ";
    case "y":
      return "ẙ";
    default:
      return char;
  }
}

export function toGreek(char: string): string {
  switch (char) {
    case "b":
      return "β";
    case "p":
      return "π";
    case "P":
      return "Π";
    case "d":
      return "δ";
    case "D":
      return "Δ";
    case "l":
      return "λ";
    case "L":
      return "Λ";
    case "j":
      return "θ";
    case "J":
      return "Θ";
    case "z":
      return "ζ";
    case "w":
      return "ω";
    case "W":
      return "Ω";
    case "A":
      return "α";
    case "u":
      return "υ";
    case "U":
      return "Υ";
    case "i":
      return "ι";
    case "e":
      return "ε";
    case "t":
      return "τ";
    case "s":
      return "σ";
    case "S":
      return "Σ";
    case "r":
      return "ρ";
    case "R":
      return "Ρ";
    case "n":
      return "ν";
    case "m":
      return "μ";
    case "y":
      return "ψ";
    case "Y":
      return "Ψ";
    case "x":
      return "ξ";
    case "X":
      return "Ξ";
    case "k":
      return "κ";
    case "q":
      return "χ";
    case "Q":
      return "Χ";
    case "g":
      return "γ";
    case "G":
      return "Γ";
    case "h":
      return "η";
    case "f":
      return "φ";
    case "F":
      return "Φ";
    default:
      return char;
  }
}

export function addIotasub(char: string): string {
  switch (char) {
    case "o":
      return "ǫ";
    case "O":
      return "Ǫ";
    case "a":
      return "ą";
    case "A":
      return "Ą";
    case "u":
      return "ų";
    case "U":
      return "Ų";
    case "i":
      return "į";
    case "I":
      return "Į";
    case "e":
      return "ę";
    case "E":
      return "Ę";
    default:
      return char;
  }
}

export const DEAD_KEY_TRANSFORMS: Record<DeadKeyName, (char: string) => string> = {
  CIRCUM: addCircum,
  TREMA: addTrema,
  ACUTE: addAcute,
  GRAVE: addGrave,
  CARON: addCaron,
  BAR: addBar,
  BREVE: addBreve,
  TILDE: addTilde,
  MACRON: addMacron,
  CEDILLA: addCedilla,
  OVERRING: addOverring,
  GREEK: toGreek,
  IOTASUB: addIotasub,
};
