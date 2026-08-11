export interface Settings {
  shell: string;
  shellArgs: string;
  cwd: string;
  keyboard: string;
  theme: string;
  language: string;
  termFontSize: number;
  audio: boolean;
  audioVolume: number;
  disableFeedbackAudio: boolean;
  clockHours: number;
  pingAddr: string;
  port: number;
  nointro: boolean;
  nocursor: boolean;
  forceFullscreen: boolean;
  allowWindowed: boolean;
  excludeThreadsFromToplist: boolean;
  hideDotfiles: boolean;
  fsListView: boolean;
  experimentalGlobeFeatures: boolean;
  experimentalFeatures: boolean;
}

export interface Shortcut {
  type: "app" | "shell";
  trigger: string;
  action: string;
  enabled: boolean;
  linebreak: boolean;
}
