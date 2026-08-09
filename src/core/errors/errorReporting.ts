import type { App } from "vue";
import { error as logError } from "@tauri-apps/plugin-log";

// Forwards to the persistent log file backed by tauri-plugin-log, so frontend errors
// survive past whatever DevTools console happened to be open at the time.
export function installErrorReporting(app: App): void {
  app.config.errorHandler = (err, _instance, info) => {
    logError(`[vue] ${String(err)} (${info})`);
    console.error(err);
  };

  window.addEventListener("unhandledrejection", (event) => {
    logError(`[unhandledrejection] ${String(event.reason)}`);
  });
}
