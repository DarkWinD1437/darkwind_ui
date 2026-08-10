import { defineStore } from "pinia";
import { fsHomeDir, fsListDir, fsListDrives } from "../filesystemClient";
import type { DriveEntry, FsEntry } from "../filesystemClient";

export const useFilesystemStore = defineStore("filesystem", {
  state: () => ({
    path: "" as string,
    parent: null as string | null,
    entries: [] as FsEntry[],
    drives: [] as DriveEntry[],
    showingDrives: false,
    listView: false,
    hideDotfiles: false,
    loading: false,
    failed: false,
  }),
  getters: {
    visibleEntries(state): FsEntry[] {
      return state.hideDotfiles ? state.entries.filter((e) => !e.hidden) : state.entries;
    },
  },
  actions: {
    async readFS(path: string) {
      this.loading = true;
      this.showingDrives = false;
      try {
        const listing = await fsListDir(path);
        this.path = listing.path;
        this.parent = listing.parent;
        this.entries = listing.entries;
        this.failed = false;
      } catch {
        this.failed = true;
      } finally {
        this.loading = false;
      }
    },
    async showDrives() {
      this.loading = true;
      try {
        this.drives = await fsListDrives();
        this.showingDrives = true;
        this.failed = false;
      } catch {
        this.failed = true;
      } finally {
        this.loading = false;
      }
    },
    async goUp() {
      if (this.parent) await this.readFS(this.parent);
    },
    async initAtHome() {
      const home = await fsHomeDir().catch(() => "");
      if (home) await this.readFS(home);
    },
    toggleListView() {
      this.listView = !this.listView;
    },
    toggleHideDotfiles() {
      this.hideDotfiles = !this.hideDotfiles;
    },
  },
});
