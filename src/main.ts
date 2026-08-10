import { createApp } from "vue";
import { createPinia } from "pinia";
import "augmented-ui/augmented-ui.min.css";
import "@xterm/xterm/css/xterm.css";
import { installErrorReporting } from "@/core/errors/errorReporting";
import App from "./App.vue";

// El original en Electron nunca mostraba el menú contextual nativo del navegador (no lo
// registraba). El WebView2 de Tauri sí lo hace por defecto (Atrás/Adelante/Recargar/
// Inspeccionar de Chromium), rompiendo la ilusión de terminal/kiosco — se desactiva acá,
// a nivel global, para igualar el comportamiento del original.
window.addEventListener("contextmenu", (event) => event.preventDefault());

const app = createApp(App);
installErrorReporting(app);
app.use(createPinia());
app.mount("#app");
