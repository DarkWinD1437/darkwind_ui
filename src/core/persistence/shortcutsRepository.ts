import { invoke } from "@tauri-apps/api/core";
import type { Shortcut } from "./types";

export function readShortcuts(): Promise<Shortcut[]> {
  return invoke("shortcuts_read");
}

export function writeShortcuts(shortcuts: Shortcut[]): Promise<void> {
  return invoke("shortcuts_write", { shortcuts });
}
