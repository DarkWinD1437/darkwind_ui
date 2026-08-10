import { invoke } from "@tauri-apps/api/core";

export function listLayouts(): Promise<string[]> {
  return invoke("keyboard_list");
}

export function readLayout(id: string): Promise<unknown> {
  return invoke("keyboard_read", { id });
}
