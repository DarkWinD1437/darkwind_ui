import { invoke } from "@tauri-apps/api/core";
import type { Settings } from "./types";

export function readSettings(): Promise<Settings> {
  return invoke("settings_read");
}

export function writeSettings(settings: Settings): Promise<void> {
  return invoke("settings_write", { settings });
}
