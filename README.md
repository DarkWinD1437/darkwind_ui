# darkwind_ui

Terminal de escritorio con estética cyberpunk, construido desde cero con **Vue 3 + TypeScript + Tauri v2 (Rust)**.

## Estado del proyecto

🚧 En desarrollo activo. Infraestructura base, terminal, paneles de sistema, explorador de archivos, teclado táctil, sistema de modales, configuración/atajos editables, internacionalización y globo 3D ya operativos: persistencia de configuración, sistema de temas, animación de arranque, layout principal, una terminal real (PowerShell) multi-pestaña con PTY nativo en Rust, los paneles laterales de reloj, CPU, memoria, GPU, procesos, red y GeoIP con datos en vivo, un explorador de archivos sincronizado con la terminal activa, un teclado táctil multi-idioma con composición de diacríticos (dead-keys), un visor de PDF y reproductor multimedia integrados, un editor de configuración y de atajos de teclado, interfaz traducible (español/inglés) con detección automática del idioma del sistema, y un globo 3D con el mapa de conexiones de red activas. Todas las fases planificadas de la migración están completas.

## Características

### Implementado

- Terminal real (shell) vía PTY nativo en Rust, multi-tab (hasta 5 pestañas)
- Búsqueda en el scrollback de la terminal (Ctrl+F) — el original no tiene esto
- Paneles de sistema en vivo: reloj, CPU (global, por núcleo, frecuencia y temperatura), memoria (uso + swap), discos, batería (con tiempo restante), procesos activos (con ruta del ejecutable y línea de comandos) y red
- Panel de red enriquecido: IP externa + ubicación (país/ciudad) + ISP (organización ASN), IP local por interfaz, y conexiones TCP activas con el nombre del proceso y la organización dueña de cada IP remota — no solo la IP pelada
- Panel de GPU (uso/VRAM/temperatura), soporte multi-fabricante real (NVIDIA, AMD, Intel) — el original solo reportaba CPU/RAM, nunca GPU
- Polling de sysinfo centralizado en un store — evita las llamadas redundantes que el original hacía por cada panel por separado
- Tooltips explicativos en los datos técnicos de los paneles de sistema (Swap, PID, ISP, VRAM, etc.) y tamaños de RAM/VRAM en unidades binarias reales (16 GiB se muestra "16 GB", no "17.2 GB" — la misma convención que usa Windows)
- Cada panel de sistema (reloj, sistema, hardware, CPU, GPU, red, tráfico, globo) se puede expandir con un click en su título a un modal más grande con letra más grande — el original no tiene nada parecido
- Explorador de archivos con navegación independiente de la terminal (cada uno se mueve por su cuenta, a pedido del usuario), vista de íconos/lista con scrollbar tematizada, toggle de archivos ocultos, vista de unidades de disco, apertura de archivos con la app del sistema (PDF/audio/video abren en un visor propio, ver más abajo). La terminal sí trackea y muestra su propio directorio de trabajo real (funciona en Windows — el original nunca pudo hacerlo ahí), solo que ya no mueve al panel
- Buscador difuso (Ctrl+Shift+F) sobre la carpeta activa del explorador
- Teclado táctil con 19 layouts de idioma (incluye dead-keys: circunflejo, diéresis, tilde, cedilla, virgulilla, y más), modificadores Shift/Ctrl/Alt/Fn, resaltado de la tecla física que se está tipeando, hover al pasar el mouse, y modo contraseña (Ctrl+Shift+P) que silencia el feedback de audio y visual
- Temas personalizables (JSON + variables CSS)
- Sistema de modales genérico (`BaseModal` + apilado real por z-index, arrastrables, Escape cierra solo el que está arriba) — reemplaza el objeto `window.modals` del original con un store tipado, con soporte para diálogos de error/warning/info/confirmación
- Editor de configuración (Settings) con todos los campos persistentes del original agrupados por sección (apariencia, audio, terminal y red, comportamiento, experimental) — reemplaza el formulario HTML gigante del original por un modal tipado en Vue
- Editor de atajos de teclado con alta/baja/reasignación en vivo (click en la combinación y presionás la tecla nueva) — el original solo permitía editar `shortcuts.json` a mano
- Visor de PDF y reproductor de audio/video integrados: al abrir un archivo compatible desde el explorador se abre en un modal propio en vez de siempre delegar a una app externa del sistema — el original no tenía esto. El video tiene pantalla completa propia (con los mismos controles tematizados de la app, no los nativos del navegador) y el menú de controles se oculta solo tras unos segundos de inactividad
- Interfaz traducible español/inglés (`vue-i18n`) con detección automática del idioma del sistema operativo al primer arranque y override manual en Settings — el original nunca tuvo i18n, todo el texto estaba hardcodeado en inglés
- Globo 3D interactivo (panel "Globo", columna de red) con los continentes/países reales dibujados (Natural Earth, resolución 110m, empaquetado con la app — nunca se descarga nada en tiempo de ejecución), tu ubicación aproximada, grilla de latitud/longitud, atmósfera con el color del tema, y auto-rotación que se pausa sola al arrastrar con el mouse y se reanuda a los 4s — reemplaza `encom-globe.js` (librería vendored sin paquete npm ni mantenimiento desde 2017) por `three-globe`, activamente mantenida y con tipos TS. Activando "Funciones experimentales del globo 3D" en Settings, cada conexión TCP activa se geolocaliza y se traza como un arco animado desde tu ubicación — una mejora real sobre el original, que solo mostraba pines estáticos sin conexión visual
- Tests dirigidos con Vitest (composición de dead-keys, validación de esquemas, paridad de claves de traducción es/en, formato de atajos de teclado, filtrado de IPs públicas/privadas y armado de puntos/arcos del globo) además de los tests de Rust

### Limitaciones conocidas

- Alcance actual: **solo Windows**.
- GeoIP funciona de fábrica para cualquier usuario final: las bases `GeoLite2-City.mmdb`, `GeoLite2-ASN.mmdb` y `GeoLite2-Country.mmdb` viajan empaquetadas dentro del instalador. Para **compilar** el proyecto vos mismo hace falta colocar las tres antes (ver `src-tauri/resources/geoip/README.md`) — sin ellas, `pnpm tauri dev`/`pnpm tauri build` fallan al no encontrar los recursos declarados.
- La temperatura de CPU/GPU depende de sensores y drivers expuestos por el sistema — en algunos equipos (especialmente laptops) puede no estar disponible ("best-effort", igual que en el original).
- El editor de atajos permite ver/reasignar/deshabilitar los 14 atajos por defecto, pero algunas acciones (`COPY`, `PASTE`, `NEXT_TAB`, `PREVIOUS_TAB`, `TAB_X`, `DEV_DEBUG`, `DEV_RELOAD`) todavía no tienen una función real asociada — quedan reservadas para una fase posterior; dispararlas hoy no hace nada (no rompe nada tampoco).
- La traducción cubre toda la interfaz principal (paneles de sistema, explorador, modales nuevos) pero no es exhaustiva al 100% del proyecto todavía — el log de arranque queda deliberadamente sin traducir (es "lore" del proyecto, no UI funcional).
- El globo 3D geolocaliza tu IP externa y las conexiones activas con las mismas bases GeoLite2 empaquetadas (ver arriba) — sin ellas el globo se ve igual pero marcado como "sin conexión", sin pines. Los puntos satelitales que orbitan el globo son puramente decorativos (posiciones aleatorias), igual que en el original.

## Desarrollo

### Setup recomendado de IDE

- [VS Code](https://code.visualstudio.com/) + [Vue - Official](https://marketplace.visualstudio.com/items?itemName=Vue.volar) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

### Comandos

```bash
pnpm install
pnpm tauri dev     # modo desarrollo
pnpm tauri build   # genera el instalador
```

> Antes de `pnpm tauri dev`/`pnpm tauri build` hay que colocar
> `GeoLite2-City.mmdb`, `GeoLite2-ASN.mmdb` y `GeoLite2-Country.mmdb` en
> `src-tauri/resources/geoip/` — instrucciones en
> `src-tauri/resources/geoip/README.md`. El proyecto no compila sin esos
> tres archivos (o placeholders) presentes en esa ruta.

## Créditos e Inspiración

Este proyecto ha sido desarrollado desde cero utilizando Vue 3, Tauri y Rust. Su interfaz táctil y estética cyberpunk están fuertemente inspiradas en el concepto original de **eDEX-UI**, creado por Gabriel "Squared" Saillard — un proyecto hoy archivado que sirvió como referencia funcional y visual. El código de darkwind_ui es una reimplementación completa (no un fork ni una copia directa de código).

Este producto incluye datos de GeoLite2 creados por MaxMind, disponibles en https://www.maxmind.com.
