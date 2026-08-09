import { defineStore } from "pinia";

export interface TerminalTab {
  key: string;
  ptyId: string | null;
  label: string;
  cwd: string;
}

const MAX_TABS = 5;

export const useTerminalsStore = defineStore("terminals", {
  state: () => ({
    tabs: [] as TerminalTab[],
    activeKey: null as string | null,
  }),
  getters: {
    activeTab(state): TerminalTab | undefined {
      return state.tabs.find((tab) => tab.key === state.activeKey);
    },
    canOpenTab(state): boolean {
      return state.tabs.length < MAX_TABS;
    },
  },
  actions: {
    openTab(): string | null {
      if (!this.canOpenTab) return null;
      const key = crypto.randomUUID();
      const label = this.tabs.length === 0 ? "MAIN SHELL" : "LOADING...";
      this.tabs.push({ key, ptyId: null, label, cwd: "" });
      this.activeKey = key;
      return key;
    },
    closeTab(key: string): void {
      const index = this.tabs.findIndex((tab) => tab.key === key);
      if (index === -1) return;
      this.tabs.splice(index, 1);
      if (this.activeKey === key) {
        this.activeKey = this.tabs.length > 0 ? this.tabs[this.tabs.length - 1].key : null;
      }
    },
    setActive(key: string): void {
      if (this.tabs.some((tab) => tab.key === key)) {
        this.activeKey = key;
      }
    },
    setPtyId(key: string, ptyId: string): void {
      const tab = this.tabs.find((t) => t.key === key);
      if (tab) tab.ptyId = ptyId;
    },
    updateStatus(key: string, patch: { cwd?: string; processName?: string }): void {
      const tab = this.tabs.find((t) => t.key === key);
      if (!tab) return;
      if (patch.cwd !== undefined) tab.cwd = patch.cwd;
      if (patch.processName) {
        const index = this.tabs.indexOf(tab);
        tab.label =
          index === 0 ? `MAIN - ${patch.processName}` : `#${index + 1} - ${patch.processName}`;
      }
    },
  },
});
