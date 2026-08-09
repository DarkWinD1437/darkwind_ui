import type { App } from "vue";
import { error as logError } from "@tauri-apps/plugin-log";

// Reenvía al archivo de log persistente respaldado por tauri-plugin-log, así los errores
// del frontend sobreviven más allá de que la consola de DevTools haya estado abierta o no.
export function installErrorReporting(app: App): void {
  app.config.errorHandler = (err, _instance, info) => {
    logError(`[vue] ${String(err)} (${info})`);
    console.error(err);
  };

  window.addEventListener("unhandledrejection", (event) => {
    logError(`[unhandledrejection] ${String(event.reason)}`);
  });
}
