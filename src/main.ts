import { createApp } from "vue";
import { createPinia } from "pinia";
import "augmented-ui/augmented-ui.min.css";
import "@xterm/xterm/css/xterm.css";
import { installErrorReporting } from "@/core/errors/errorReporting";
import App from "./App.vue";

const app = createApp(App);
installErrorReporting(app);
app.use(createPinia());
app.mount("#app");
