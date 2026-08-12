import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { SearchAddon } from "@xterm/addon-search";
import { WebglAddon } from "@xterm/addon-webgl";
import { Channel, invoke } from "@tauri-apps/api/core";
import { readText, writeText } from "@tauri-apps/plugin-clipboard-manager";
import type { ITheme } from "@xterm/xterm";
import { TauriPtyAddon } from "../adapters/TauriPtyAddon";

export interface UseTerminalOptions {
  shell: string;
  args?: string[];
  cwd?: string;
  fontFamily: string;
  fontSize: number;
  cursorStyle: "block" | "underline" | "bar";
  theme: ITheme;
}

export interface PtyStatus {
  cwd: string | null;
  processName: string | null;
}

export function useTerminal(options: UseTerminalOptions) {
  const terminal = new Terminal({
    fontFamily: `"${options.fontFamily}", monospace`,
    fontSize: options.fontSize,
    cursorStyle: options.cursorStyle,
    // xterm.js no titila el cursor por defecto — el original SÍ lo hacía siempre
    // (terminal.class.js, cursorBlink queda en true pase lo que pase por un `|| true`
    // en su lectura del tema). Sin esto el cursor de la terminal quedaba fijo, la
    // única animación "operacional" del inventario de Fase 7 que todavía faltaba.
    cursorBlink: true,
    theme: options.theme,
    allowProposedApi: true,
  });
  const fitAddon = new FitAddon();
  const searchAddon = new SearchAddon();
  terminal.loadAddon(fitAddon);
  terminal.loadAddon(searchAddon);

  let ptyId: string | null = null;
  let ptyAddon: TauriPtyAddon | null = null;
  let resizeObserver: ResizeObserver | null = null;

  async function mount(el: HTMLElement): Promise<string> {
    terminal.open(el);
    try {
      terminal.loadAddon(new WebglAddon());
    } catch {
      // Sin soporte WebGL disponible; xterm.js cae automáticamente al renderer en canvas 2D.
    }
    fitAddon.fit();

    // El listener se conecta ANTES de invocar pty_spawn: el hilo lector de Rust puede
    // empezar a mandar datos (el banner de PowerShell, por ejemplo) apenas spawnea el
    // proceso, no cuando el `await invoke` del lado JS termina de resolver. Si
    // `onmessage` se asignara después del await, cualquier salida que llegue mientras
    // tanto cae en el handler no-op por defecto del Channel y se pierde para siempre
    // (se vio pasar justo con la primera pestaña, creada en medio de la animación de
    // arranque, mientras que pestañas agregadas con la UI ya en reposo no lo sufrían).
    const channel = new Channel<number[]>();
    channel.onmessage = (chunk) => terminal.write(new Uint8Array(chunk));

    ptyId = await invoke<string>("pty_spawn", {
      shell: options.shell,
      args: options.args ?? [],
      cwd: options.cwd ?? "",
      cols: terminal.cols,
      rows: terminal.rows,
      onData: channel,
    });

    ptyAddon = new TauriPtyAddon(ptyId);
    terminal.loadAddon(ptyAddon);

    resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      if (ptyId) {
        void invoke("pty_resize", { id: ptyId, cols: terminal.cols, rows: terminal.rows });
      }
    });
    resizeObserver.observe(el);

    return ptyId;
  }

  async function fetchStatus(): Promise<PtyStatus> {
    if (!ptyId) return { cwd: null, processName: null };
    return invoke<PtyStatus>("pty_status", { id: ptyId });
  }

  function focus(): void {
    terminal.focus();
  }

  function findNext(query: string): void {
    searchAddon.findNext(query);
  }

  function findPrevious(query: string): void {
    searchAddon.findPrevious(query);
  }

  // El original resuelve COPY/PASTE con el portapapeles nativo de Electron
  // (@electron/remote). Acá se usa tauri-plugin-clipboard-manager en vez de
  // navigator.clipboard del navegador porque WebView2 pide permiso por cada llamada
  // salvo que la página esté servida como "segura" — el plugin evita ese prompt.
  async function copySelection(): Promise<void> {
    const selection = terminal.getSelection();
    if (selection) await writeText(selection);
  }

  async function pasteFromClipboard(): Promise<void> {
    const text = await readText();
    if (text) terminal.paste(text);
  }

  async function dispose(): Promise<void> {
    resizeObserver?.disconnect();
    if (ptyId) {
      await invoke("pty_kill", { id: ptyId }).catch(() => {});
    }
    terminal.dispose();
  }

  return {
    terminal,
    mount,
    dispose,
    focus,
    findNext,
    findPrevious,
    fetchStatus,
    copySelection,
    pasteFromClipboard,
  };
}
