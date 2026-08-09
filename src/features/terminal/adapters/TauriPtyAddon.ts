import type { IDisposable, ITerminalAddon, Terminal } from "@xterm/xterm";
import { invoke } from "@tauri-apps/api/core";

// Reemplaza a xterm-addon-attach: en vez de un WebSocket crudo, la entrada del usuario
// viaja por invoke('pty_write', ...). La salida del PTY (Channel de Tauri -> terminal)
// se conecta directo en useTerminal.mount(), no acá — ver el comentario ahí sobre por
// qué ese cableado necesita existir antes de invocar pty_spawn.
export class TauriPtyAddon implements ITerminalAddon {
  private dataListener: IDisposable | undefined;

  constructor(private readonly ptyId: string) {}

  activate(terminal: Terminal): void {
    this.dataListener = terminal.onData((data) => {
      void invoke("pty_write", { id: this.ptyId, data });
    });
  }

  dispose(): void {
    this.dataListener?.dispose();
  }
}
