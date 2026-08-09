import { Howl, Howler } from "howler";
import { soundUrls } from "./sounds";

export interface SoundEffect {
  play(): void;
}

class NullSound implements SoundEffect {
  play(): void {
    // Audio deshabilitado o sonido de feedback suprimido — no-op intencional.
  }
}

class HowlSound implements SoundEffect {
  private howl: Howl;

  constructor(src: string, volume?: number) {
    this.howl = new Howl({ src: [src], volume });
  }

  play(): void {
    this.howl.play();
  }
}

export interface AudioManagerConfig {
  enabled: boolean;
  volume: number;
  feedbackEnabled: boolean;
}

const DEFAULT_CONFIG: AudioManagerConfig = {
  enabled: true,
  volume: 1.0,
  feedbackEnabled: true,
};

// Los sonidos de feedback (stdout/stdin/folder/granted) suenan en cada tecla o evento de
// navegación — `feedbackEnabled: false` silencia solo esos, igual que disableFeedbackAudio
// en el original.
const FEEDBACK_VOLUME = 0.4;

export class AudioManager {
  stdout: SoundEffect = new NullSound();
  stdin: SoundEffect = new NullSound();
  folder: SoundEffect = new NullSound();
  granted: SoundEffect = new NullSound();
  keyboard: SoundEffect = new NullSound();
  theme: SoundEffect = new NullSound();
  expand: SoundEffect = new NullSound();
  panels: SoundEffect = new NullSound();
  scan: SoundEffect = new NullSound();
  denied: SoundEffect = new NullSound();
  info: SoundEffect = new NullSound();
  alarm: SoundEffect = new NullSound();
  error: SoundEffect = new NullSound();

  constructor(config: AudioManagerConfig = DEFAULT_CONFIG) {
    this.configure(config);
  }

  configure(config: AudioManagerConfig): void {
    if (!config.enabled) {
      Howler.volume(0);
      return;
    }

    if (config.feedbackEnabled) {
      this.stdout = new HowlSound(soundUrls.stdout, FEEDBACK_VOLUME);
      this.stdin = new HowlSound(soundUrls.stdin, FEEDBACK_VOLUME);
      this.folder = new HowlSound(soundUrls.folder);
      this.granted = new HowlSound(soundUrls.granted);
    }
    this.keyboard = new HowlSound(soundUrls.keyboard);
    this.theme = new HowlSound(soundUrls.theme);
    this.expand = new HowlSound(soundUrls.expand);
    this.panels = new HowlSound(soundUrls.panels);
    this.scan = new HowlSound(soundUrls.scan);
    this.denied = new HowlSound(soundUrls.denied);
    this.info = new HowlSound(soundUrls.info);
    this.alarm = new HowlSound(soundUrls.alarm);
    this.error = new HowlSound(soundUrls.error);

    Howler.volume(config.volume);
  }
}

export const audioManager = new AudioManager();
