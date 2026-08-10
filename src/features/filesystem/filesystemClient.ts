import { invoke } from "@tauri-apps/api/core";

export interface FsEntry {
  name: string;
  path: string;
  isDir: boolean;
  isSymlink: boolean;
  hidden: boolean;
  size: number;
  modifiedMs: number | null;
}

export interface FsListing {
  path: string;
  parent: string | null;
  entries: FsEntry[];
}

export interface DriveEntry {
  name: string;
  mountPoint: string;
  isRemovable: boolean;
  total: number;
  available: number;
}

export function fsListDir(path: string): Promise<FsListing> {
  return invoke("fs_list_dir", { path });
}

export function fsListDrives(): Promise<DriveEntry[]> {
  return invoke("fs_list_drives");
}

export function fsHomeDir(): Promise<string> {
  return invoke("fs_home_dir");
}
