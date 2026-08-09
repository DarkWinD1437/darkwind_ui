import alarmUrl from "@/assets/audio/alarm.wav";
import deniedUrl from "@/assets/audio/denied.wav";
import errorUrl from "@/assets/audio/error.wav";
import expandUrl from "@/assets/audio/expand.wav";
import folderUrl from "@/assets/audio/folder.wav";
import grantedUrl from "@/assets/audio/granted.wav";
import infoUrl from "@/assets/audio/info.wav";
import keyboardUrl from "@/assets/audio/keyboard.wav";
import panelsUrl from "@/assets/audio/panels.wav";
import scanUrl from "@/assets/audio/scan.wav";
import stdinUrl from "@/assets/audio/stdin.wav";
import stdoutUrl from "@/assets/audio/stdout.wav";
import themeUrl from "@/assets/audio/theme.wav";

export const soundUrls = {
  alarm: alarmUrl,
  denied: deniedUrl,
  error: errorUrl,
  expand: expandUrl,
  folder: folderUrl,
  granted: grantedUrl,
  info: infoUrl,
  keyboard: keyboardUrl,
  panels: panelsUrl,
  scan: scanUrl,
  stdin: stdinUrl,
  stdout: stdoutUrl,
  theme: themeUrl,
} as const;

export type SoundName = keyof typeof soundUrls;
