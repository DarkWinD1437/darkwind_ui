import { invoke } from "@tauri-apps/api/core";

export function listThemes(): Promise<string[]> {
  return invoke("theme_list");
}

export function readTheme(id: string): Promise<unknown> {
  return invoke("theme_read", { id });
}
