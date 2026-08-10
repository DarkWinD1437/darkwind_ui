import { describe, expect, it } from "vitest";
import {
  CTRL_SEQUENCES,
  resolveControlSequences,
  addAcute,
  addBar,
  addBreve,
  addCaron,
  addCedilla,
  addCircum,
  addGrave,
  addIotasub,
  addMacron,
  addOverring,
  addTilde,
  addTrema,
  toGreek,
} from "./deadKeys";

describe("CTRL_SEQUENCES", () => {
  it("tiene 22 entradas (índice 0 vacío + 21 secuencias)", () => {
    expect(CTRL_SEQUENCES).toHaveLength(22);
    expect(CTRL_SEQUENCES[0]).toBe("");
    expect(CTRL_SEQUENCES[1]).toBe("\x1B");
  });

  it("corrige el bug de Ctrl+T del original (índice 9 ya no colisiona con Ctrl+R)", () => {
    expect(CTRL_SEQUENCES[9]).toBe("\x14");
    expect(CTRL_SEQUENCES[8]).toBe("\x12");
    expect(CTRL_SEQUENCES[9]).not.toBe(CTRL_SEQUENCES[8]);
  });
});

describe("resolveControlSequences", () => {
  it("reemplaza un placeholder que ocupa todo el string", () => {
    expect(resolveControlSequences("~~~CTRLSEQ1~~~")).toBe("\x1B");
  });

  it("reemplaza un placeholder en medio de una secuencia ANSI más larga (F5)", () => {
    expect(resolveControlSequences("~~~CTRLSEQ1~~~[15~")).toBe("\x1B[15~");
  });

  it("deja intacto un string sin placeholders", () => {
    expect(resolveControlSequences("hola")).toBe("hola");
  });
});

describe("dead-keys: composición de diacríticos", () => {
  it("addCircum compone vocales y superíndices numéricos, y no transforma lo no mapeado", () => {
    expect(addCircum("e")).toBe("ê");
    expect(addCircum("E")).toBe("Ê");
    expect(addCircum("1")).toBe("¹");
    expect(addCircum("0")).toBe("⁰");
    expect(addCircum("!")).toBe("!");
  });

  it("addTrema compone diéresis", () => {
    expect(addTrema("u")).toBe("ü");
    expect(addTrema("U")).toBe("Ü");
    expect(addTrema("z")).toBe("z");
  });

  it("addAcute compone tildes agudas", () => {
    expect(addAcute("a")).toBe("á");
    expect(addAcute("n")).toBe("ń");
    expect(addAcute("ç")).toBe("ḉ");
  });

  it("addGrave compone tildes graves", () => {
    expect(addGrave("a")).toBe("à");
    expect(addGrave("E")).toBe("È");
  });

  it("addCaron compone carones y subíndices numéricos", () => {
    expect(addCaron("s")).toBe("š");
    expect(addCaron("S")).toBe("Š");
    expect(addCaron("9")).toBe("₉");
  });

  it("addBar compone barra inscrita", () => {
    expect(addBar("o")).toBe("ø");
    expect(addBar("O")).toBe("Ø");
  });

  it("addBreve compone breve", () => {
    expect(addBreve("a")).toBe("ă");
    expect(addBreve("à")).toBe("ằ");
  });

  it("addTilde compone virgulilla", () => {
    expect(addTilde("n")).toBe("ñ");
    expect(addTilde("N")).toBe("Ñ");
  });

  it("addMacron compone macrón", () => {
    expect(addMacron("o")).toBe("ō");
    expect(addMacron("é")).toBe("ḗ");
  });

  it("addCedilla compone cedilla", () => {
    expect(addCedilla("c")).toBe("ç");
    expect(addCedilla("C")).toBe("Ç");
  });

  it("addOverring compone anillo superior", () => {
    expect(addOverring("a")).toBe("å");
    expect(addOverring("A")).toBe("Å");
  });

  it("toGreek transcribe al alfabeto griego", () => {
    expect(toGreek("b")).toBe("β");
    expect(toGreek("p")).toBe("π");
    expect(toGreek("1")).toBe("1");
  });

  it("addIotasub compone ogonek/iota suscrita", () => {
    expect(addIotasub("a")).toBe("ą");
    expect(addIotasub("O")).toBe("Ǫ");
  });

  it("una tecla no combinable devuelve el carácter original sin insertar el símbolo del dead-key", () => {
    // Comportamiento fiel al original: si la combinación no está definida, se pierde
    // el símbolo del dead-key en vez de insertar ambos caracteres sueltos.
    expect(addCircum("!")).toBe("!");
    expect(addTrema("q")).toBe("q");
  });
});
