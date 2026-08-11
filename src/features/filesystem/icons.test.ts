import { describe, expect, it } from "vitest";
import { matchIcon } from "./fileIconsMatcher";
import { fileOpenKind } from "./icons";

describe("fileOpenKind", () => {
  it("clasifica PDFs para abrir en DocReaderModal", () => {
    expect(fileOpenKind(matchIcon("informe.pdf"))).toBe("pdf");
  });

  it("clasifica audio/video para abrir en MediaPlayerModal", () => {
    expect(fileOpenKind(matchIcon("cancion.mp3"))).toBe("audio");
    expect(fileOpenKind(matchIcon("pelicula.mp4"))).toBe("video");
  });

  it("no clasifica archivos de texto/código — esos siguen cayendo a openPath()", () => {
    expect(fileOpenKind(matchIcon("main.ts"))).toBeNull();
    expect(fileOpenKind(matchIcon("readme.md"))).toBeNull();
  });

  it("devuelve null para un nombre sin match (undefined)", () => {
    expect(fileOpenKind(undefined)).toBeNull();
  });
});
