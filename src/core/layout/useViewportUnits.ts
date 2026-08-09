import { ref } from "vue";
import { getCurrentWindow } from "@tauri-apps/api/window";

// AppShell/BootSequence están maquetados enteramente en unidades vh/vw, así que este
// composable solo se encarga del toggle fullscreen<->ventana, no del tamaño.
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
