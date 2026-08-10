import { describe, expect, it } from "vitest";
import { keyDefSchema, keyboardLayoutSchema } from "./keyboard.schema";

describe("keyDefSchema", () => {
  it("acepta una tecla mínima con solo name/cmd", () => {
    expect(() => keyDefSchema.parse({ name: "A", cmd: "a" })).not.toThrow();
  });

  it("acepta una tecla con todas las variantes de modificador", () => {
    const key = {
      name: "e",
      cmd: "e",
      shiftName: "E",
      shiftCmd: "E",
      altName: "€",
      altCmd: "€",
      fnName: "F5",
      fnCmd: "~~~CTRLSEQ1~~~OP",
      altShiftName: "ε",
      altShiftCmd: "ε",
      ctrlCmd: "\x05",
      capsLckCmd: "É",
    };
    expect(() => keyDefSchema.parse(key)).not.toThrow();
  });

  it("rechaza una tecla sin name", () => {
    expect(() => keyDefSchema.parse({ cmd: "a" })).toThrow();
  });

  it("rechaza una tecla sin cmd", () => {
    expect(() => keyDefSchema.parse({ name: "A" })).toThrow();
  });
});

describe("keyboardLayoutSchema", () => {
  it("acepta un layout completo con las filas esperadas", () => {
    const layout = {
      row_numbers: [{ name: "ESC", cmd: "~~~CTRLSEQ1~~~" }],
      row_1: [{ name: "Q", cmd: "q", shiftName: "Q", shiftCmd: "Q" }],
      row_space: [{ name: " ", cmd: " " }],
    };
    expect(() => keyboardLayoutSchema.parse(layout)).not.toThrow();
  });

  it("rechaza un layout mal formado (una fila no es un array)", () => {
    const malformed = { row_1: { name: "Q", cmd: "q" } };
    expect(() => keyboardLayoutSchema.parse(malformed)).toThrow();
  });

  it("rechaza una tecla dentro del layout que le falta un campo requerido", () => {
    const malformed = { row_1: [{ name: "Q" }] };
    expect(() => keyboardLayoutSchema.parse(malformed)).toThrow();
  });
});
