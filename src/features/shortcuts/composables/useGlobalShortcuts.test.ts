import { describe, expect, it } from "vitest";
import { eventToTriggerString } from "./useGlobalShortcuts";

// El orden de modificadores (Ctrl, Shift, Alt) y el formato de estos triggers tienen
// que calzar EXACTO con los strings que ya vive en default_shortcuts() (settings.rs)
// — si se desalinean, un shortcut por defecto queda huérfano (nunca matchea ningún
// keydown real) sin que nada lo marque como roto hasta que un usuario lo reporte.
function fakeEvent(init: Partial<KeyboardEvent>): KeyboardEvent {
  return {
    key: "",
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false,
    ...init,
  } as KeyboardEvent;
}

describe("eventToTriggerString", () => {
  it("arma triggers simples con una sola letra en mayúscula", () => {
    expect(eventToTriggerString(fakeEvent({ ctrlKey: true, key: "x" }))).toBe("Ctrl+X");
  });

  it("respeta el orden Ctrl, Shift, Alt de los defaults de settings.rs", () => {
    expect(eventToTriggerString(fakeEvent({ ctrlKey: true, shiftKey: true, key: "c" }))).toBe(
      "Ctrl+Shift+C",
    );
    expect(
      eventToTriggerString(fakeEvent({ ctrlKey: true, shiftKey: true, altKey: true, key: " " })),
    ).toBe("Ctrl+Shift+Alt+Space");
  });

  it("preserva nombres de tecla ya capitalizados (Tab, F5)", () => {
    expect(eventToTriggerString(fakeEvent({ ctrlKey: true, key: "Tab" }))).toBe("Ctrl+Tab");
    expect(eventToTriggerString(fakeEvent({ ctrlKey: true, shiftKey: true, key: "F5" }))).toBe(
      "Ctrl+Shift+F5",
    );
  });

  it("devuelve null para una tecla modificadora sola (sin tecla real todavía)", () => {
    expect(eventToTriggerString(fakeEvent({ ctrlKey: true, key: "Control" }))).toBeNull();
    expect(eventToTriggerString(fakeEvent({ shiftKey: true, key: "Shift" }))).toBeNull();
  });
});
