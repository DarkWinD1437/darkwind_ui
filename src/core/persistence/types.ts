export interface Settings {
  shell: string;
  shellArgs: string;
  cwd: string;
  keyboard: string;
  theme: string;
  language: string;
  uiScale: number;
  virtualKeyboard: boolean;
  termFontSize: number;
  audio: boolean;
  audioVolume: number;
  disableFeedbackAudio: boolean;
  clockHours: number;
  pingAddr: string;
  nointro: boolean;
  forceFullscreen: boolean;
  hideDotfiles: boolean;
  fsListView: boolean;
  experimentalGlobeFeatures: boolean;
}

export interface Shortcut {
  type: "app" | "shell";
  trigger: string;
  action: string;
  enabled: boolean;
  linebreak: boolean;
}
