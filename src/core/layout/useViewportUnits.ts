import { ref } from "vue";
import { getCurrentWindow } from "@tauri-apps/api/window";

// AppShell/BootSequence are laid out entirely in vh/vw units, so this composable only
// owns the fullscreen<->windowed toggle, not sizing.
export function useViewportUnits() {
  const isFullscreen = ref(true);

  async function syncFromWindow(): Promise<void> {
    isFullscreen.value = await getCurrentWindow().isFullscreen();
  }

  async function setFullscreen(value: boolean): Promise<void> {
    await getCurrentWindow().setFullscreen(value);
    isFullscreen.value = value;
  }

  async function toggleFullscreen(): Promise<void> {
    await setFullscreen(!isFullscreen.value);
  }

  return { isFullscreen, syncFromWindow, setFullscreen, toggleFullscreen };
}
