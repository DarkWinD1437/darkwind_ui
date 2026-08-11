import { defineStore } from "pinia";
import { audioManager } from "@/core/audio/audioManager";

export type AlertType = "error" | "warning" | "info" | "confirm";

export interface AlertModal {
  id: string;
  type: AlertType;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string | null;
  resolve: (confirmed: boolean) => void;
}

export interface AlertOptions {
  title: string;
  message: string;
  confirmLabel?: string;
}

export interface ConfirmOptions extends AlertOptions {
  cancelLabel?: string;
}

// Reemplaza window.modals del original (un objeto keyed con instancias ad-hoc por
// cada `new Modal(...)` disperso en el código) por una cola tipada: cualquier feature
// puede pedir un error/warning/info/confirm sin conocer a ModalHost ni a los demás
// módulos que también puedan tener uno abierto — se apilan solos vía useModalStack.
export const useModalsStore = defineStore("modals", {
  state: () => ({
    alerts: [] as AlertModal[],
  }),
  actions: {
    alert(type: AlertType, options: AlertOptions): Promise<boolean> {
      const sound =
        type === "error" ? audioManager.error : type === "warning" ? audioManager.denied : audioManager.info;
      sound.play();
      return new Promise((resolve) => {
        this.alerts.push({
          id: crypto.randomUUID(),
          type,
          title: options.title,
          message: options.message,
          confirmLabel: options.confirmLabel ?? "Aceptar",
          cancelLabel: null,
          resolve,
        });
      });
    },
    error(options: AlertOptions): Promise<boolean> {
      return this.alert("error", options);
    },
    warning(options: AlertOptions): Promise<boolean> {
      return this.alert("warning", options);
    },
    info(options: AlertOptions): Promise<boolean> {
      return this.alert("info", options);
    },
    confirm(options: ConfirmOptions): Promise<boolean> {
      audioManager.info.play();
      return new Promise((resolve) => {
        this.alerts.push({
          id: crypto.randomUUID(),
          type: "confirm",
          title: options.title,
          message: options.message,
          confirmLabel: options.confirmLabel ?? "Confirmar",
          cancelLabel: options.cancelLabel ?? "Cancelar",
          resolve,
        });
      });
    },
    resolve(id: string, confirmed: boolean): void {
      const index = this.alerts.findIndex((a) => a.id === id);
      if (index === -1) return;
      this.alerts[index].resolve(confirmed);
      this.alerts.splice(index, 1);
    },
  },
});
