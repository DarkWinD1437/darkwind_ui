# darkwind_ui

Terminal de escritorio con estética cyberpunk, construido desde cero con **Vue 3 + TypeScript + Tauri v2 (Rust)**.

darkwind_ui es un entorno de escritorio kiosco (fullscreen) que combina una terminal real (PowerShell u otro shell, con PTY nativo), paneles de monitoreo del sistema en vivo, un explorador de archivos, un teclado táctil y un globo 3D de conexiones de red, todo bajo una estética retro-hacker inspirada en la interfaz de ciencia ficción de películas como *Matrix* o *Tron*. Está pensado para correr en una pantalla dedicada (un segundo monitor, una tablet, una Raspberry Pi con pantalla) tanto como para uso diario en el escritorio de Windows.


## Qué hace, panel por panel

- **Terminal** (centro): shell real corriendo en un proceso PTY nativo (no una simulación) — todo lo que se tipea llega de verdad al sistema operativo. Soporta hasta 5 pestañas simultáneas, búsqueda en el scrollback, copiar/pegar con el portapapeles de Windows, y muestra el directorio de trabajo y el nombre del proceso activo en tiempo real.
- **Columna izquierda** (sistema): reloj, información de SO/host, CPU (uso global y por núcleo, frecuencia, temperatura si el hardware la expone), memoria (RAM + swap), GPU (uso/VRAM/temperatura, con soporte NVIDIA/AMD/Intel), discos, batería y el top de procesos por consumo — todo con datos reales, actualizados por polling.
- **Columna derecha** (red): IP externa + ubicación geográfica + proveedor de internet, IPs locales por interfaz, tráfico de red, tabla de conexiones TCP activas (con el proceso dueño de cada una), y un globo 3D navegable que puede trazar arcos animados hacia cada conexión activa.
- **Franja inferior**: un explorador de archivos con vista de íconos o lista, y un teclado táctil en pantalla con 19 layouts de idioma y soporte de diacríticos (dead-keys) — opcional, se puede ocultar desde Settings y el explorador crece solo para ocupar el espacio libre.
- **Modales**: editor de configuración (Settings), editor de atajos de teclado, visor de PDF, reproductor de audio/video, buscador difuso de archivos y ayuda de atajos — todos con la misma estética que el resto de la app, en vez de delegar a programas externos de Windows.

## Características completas

- Terminal real (shell) vía PTY nativo en Rust, multi-tab (hasta 5 pestañas)
- Búsqueda en el scrollback de la terminal (Ctrl+F)
- Copiar/pegar en la terminal con el portapapeles nativo de Windows (`Ctrl+Shift+C` copia la selección activa, `Ctrl+Shift+V` pega en la posición del cursor), y navegación de pestañas por teclado (`Ctrl+Tab` / `Ctrl+Shift+Tab` para rotar entre pestañas, `Ctrl+X` para cerrar la activa)
- Paneles de sistema en vivo: reloj, CPU (global, por núcleo, frecuencia y temperatura), memoria (uso + swap), discos, batería (con tiempo restante), procesos activos (con ruta del ejecutable y línea de comandos) y red
- Panel de red enriquecido: IP externa + ubicación (país/ciudad) + ISP (organización ASN), IP local por interfaz, y conexiones TCP activas con el nombre del proceso y la organización dueña de cada IP remota — no solo la IP pelada
- Panel de GPU (uso/VRAM/temperatura), soporte multi-fabricante real (NVIDIA, AMD, Intel)
- Tooltips explicativos en los datos técnicos de los paneles de sistema (Swap, PID, ISP, VRAM, etc.) y tamaños de RAM/VRAM en unidades binarias reales (16 GiB se muestra "16 GB", no "17.2 GB" — la misma convención que usa Windows)
- Cada panel de sistema (reloj, sistema, hardware, CPU, GPU, red, tráfico, globo) se puede expandir con un click en su título a un modal más grande con letra más grande
- Explorador de archivos con navegación independiente de la terminal (cada uno se mueve por su cuenta, a pedido del usuario), vista de íconos/lista con scrollbar tematizada, toggle de archivos ocultos, vista de unidades de disco, apertura de archivos con la app del sistema (PDF/audio/video abren en un visor propio, ver más abajo). La terminal trackea y muestra su propio directorio de trabajo real
- Buscador difuso (Ctrl+Shift+F) sobre la carpeta activa del explorador
- Teclado táctil con 19 layouts de idioma (incluye dead-keys: circunflejo, diéresis, tilde, cedilla, virgulilla, y más), modificadores Shift/Ctrl/Alt/Fn, resaltado de la tecla física que se está tipeando, hover al pasar el mouse, y modo contraseña (Ctrl+Shift+P) que silencia el feedback de audio y visual
- Temas personalizables (JSON + variables CSS)
- Sistema de modales genérico (apilado real por z-index, arrastrables, Escape cierra solo el que está arriba), con soporte para diálogos de error/warning/info/confirmación
- Editor de configuración (Settings) con todos los campos persistentes agrupados por sección (apariencia, audio, terminal y red, comportamiento, experimental)
- Tamaño de letra general ajustable (85%–140%) desde Settings: escala el texto de toda la interfaz sin romper el layout de paneles/modales (el logo de arranque/cierre y su log quedan fijos a 120%, no siguen esta escala)
- Teclado táctil opcional: se puede ocultar por completo desde Settings — el explorador de archivos se expande solo para aprovechar el espacio libre cuando está oculto
- Selector de modo de ventana (pantalla completa / ventana) que aplica el cambio al instante, sin reiniciar la app
- Editor de atajos de teclado con alta/baja/reasignación en vivo (click en la combinación y presionás la tecla nueva)
- Visor de PDF y reproductor de audio/video integrados: al abrir un archivo compatible desde el explorador se abre en un modal propio en vez de siempre delegar a una app externa del sistema. El video tiene pantalla completa propia y el menú de controles se oculta solo tras unos segundos de inactividad
- Interfaz traducible español/inglés, con detección automática del idioma del sistema operativo al primer arranque y override manual en Settings
- Globo 3D interactivo con los continentes/países reales dibujados, tu ubicación aproximada, grilla de latitud/longitud, atmósfera con el color del tema, y auto-rotación que se pausa sola al arrastrar con el mouse. Activando "Funciones experimentales del globo 3D" en Settings, cada conexión TCP activa se geolocaliza y se traza como un arco animado desde tu ubicación
- Animación de cierre cinematográfica (~6s): al cerrar la ventana se intercepta el cierre, se termina cada sesión de terminal activa de forma prolija, y una secuencia visual con efecto glitch + log de cierre estilo terminal corre antes de cerrar de verdad
- Auto-actualización: la app avisa sola cuando hay una versión nueva y puede instalarla con un click (ver [Actualizaciones](#actualizaciones))

## Para usuarios finales

### Requisitos mínimos

- **Sistema operativo**: Windows 10 versión 1803 (abril 2018) en adelante, o Windows 11. El motor de renderizado (WebView2) viene preinstalado de fábrica en esas versiones.
- **Arquitectura**: x64 (64 bits). No hay build para Windows ARM64 por ahora.
- **RAM**: 4 GB o más recomendado.
- **Disco**: ~100 MB libres tras instalar.
- **GPU**: opcional — sin GPU dedicada detectable, el panel de GPU simplemente muestra "sin datos".
- **Internet**: no hace falta para el uso normal (el GeoIP funciona con datos ya incluidos en el instalador). Se usa puntualmente para detectar tu IP pública y para chequear actualizaciones.

### Instalación

1. Descargá el instalador (`darkwind_ui_<versión>_x64-setup.exe`) desde la sección [Releases](../../releases) del repositorio.
2. Ejecutalo. Como no está firmado digitalmente, es esperable que Windows SmartScreen muestre **"Windows protegió su PC"** — hacé click en **"Más información"** y luego en **"Ejecutar de todas formas"**. Esto es normal para software de distribución personal/independiente sin certificado de firma de código, no indica ningún problema con el instalador.
3. Seguí los pasos del instalador — no hace falta cuenta ni licencia, se instala como cualquier programa de Windows.
4. Al primer arranque la app crea automáticamente su configuración en tu carpeta de usuario — no hace falta ningún paso manual extra.

### Primeros pasos

- La app arranca **en pantalla completa** por defecto (comportamiento "kiosco"); se puede cambiar a modo ventana desde **Settings**. Para salir: el botón **⏻** junto a los íconos de Settings/Shortcuts en el explorador de archivos, o el atajo `Ctrl+Shift+Q` — ambos disparan la animación de cierre y terminan las sesiones de terminal abiertas de forma prolija.
- El shell por defecto es PowerShell; se puede cambiar (junto con el tema, el idioma, el layout de teclado y más) desde **Settings** (`Ctrl+Shift+S`, o el ícono ⚙ en el explorador).
- El idioma de la interfaz se detecta solo a partir del idioma configurado en Windows; se puede forzar español o inglés manualmente desde Settings.
- Para ver o editar cualquier atajo de teclado: **Shortcuts** (`Ctrl+Shift+K`, o el ícono ⌨ en el explorador).

### Actualizaciones

Si hay una versión más nueva publicada, un banner aparece solo al arrancar con tres botones: **"Ver en GitHub"** (abre la página del release en tu navegador, sin tocar nada más), **"Actualizar ahora"** (descarga, instala y reinicia la app sola), y **"Cancelar"** (cierra el banner por esta sesión — vuelve a aparecer la próxima vez que abras la app si seguís desactualizado). No hace falta ninguna cuenta ni configuración de tu parte para que esto funcione.

### Atajos de teclado por defecto

| Atajo | Acción |
|---|---|
| `Ctrl+Shift+Q` | Cerrar la app (con animación de cierre) |
| `Ctrl+Shift+S` | Abrir Settings |
| `Ctrl+Shift+K` | Abrir el editor de atajos (Shortcuts) |
| `Ctrl+F` | Buscar en el scrollback de la terminal activa |
| `Ctrl+Shift+F` | Buscador difuso de archivos |
| `Ctrl+Shift+C` | Copiar la selección activa de la terminal |
| `Ctrl+Shift+V` | Pegar en la terminal |
| `Ctrl+Tab` / `Ctrl+Shift+Tab` | Siguiente / anterior pestaña de terminal |
| `Ctrl+X` | Cerrar la pestaña de terminal activa |
| `Ctrl+Shift+L` | Alternar vista de íconos/lista en el explorador |
| `Ctrl+Shift+H` | Mostrar/ocultar archivos ocultos en el explorador |
| `Ctrl+Shift+P` | Modo contraseña del teclado táctil (silencia feedback visual/sonoro) |

Todos estos atajos son editables (o se pueden deshabilitar) desde el modal de Shortcuts — la tabla de arriba es la configuración de fábrica.

### Limitaciones conocidas

- Alcance actual: **solo Windows**.
- La temperatura de CPU/GPU depende de sensores y drivers expuestos por el sistema — en algunos equipos (especialmente laptops) puede no estar disponible ("best-effort").
- El instalador no está firmado digitalmente — ver el aviso de SmartScreen en [Instalación](#instalación).
- El editor de atajos permite ver/reasignar/deshabilitar todos los atajos por defecto, pero dos de ellos (`DEV_DEBUG`, `DEV_RELOAD`) son herramientas de depuración pensadas para desarrollo, no para el usuario final, y quedan deliberadamente sin una función real asociada en esta build (dispararlas no rompe nada, simplemente no hacen nada).
- La traducción cubre toda la interfaz principal pero el log de arranque queda deliberadamente sin traducir (es "lore" del proyecto, no UI funcional).
- El globo 3D geolocaliza tu IP externa y las conexiones activas — los puntos satelitales que orbitan el globo son puramente decorativos (posiciones aleatorias).

## Para desarrolladores

### Requisitos para compilar

- [Node.js](https://nodejs.org/) + [pnpm](https://pnpm.io/), [Rust](https://www.rust-lang.org/) (toolchain estable) y los [prerequisitos de Tauri v2 para Windows](https://v2.tauri.app/start/prerequisites/) (WebView2, Visual Studio Build Tools con carga de trabajo C++).
- Las 3 bases GeoLite2 (`GeoLite2-City.mmdb`, `GeoLite2-ASN.mmdb`, `GeoLite2-Country.mmdb`) colocadas en `src-tauri/resources/geoip/` — instrucciones para conseguirlas (gratis, cuenta propia de MaxMind) en `src-tauri/resources/geoip/README.md`. El proyecto no compila sin esos tres archivos presentes en esa ruta.

### Setup recomendado de IDE

- [VS Code](https://code.visualstudio.com/) + [Vue - Official](https://marketplace.visualstudio.com/items?itemName=Vue.volar) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

### Comandos

```bash
pnpm install
pnpm tauri dev     # modo desarrollo
pnpm tauri build   # genera el instalador (.exe NSIS) en src-tauri/target/release/bundle/nsis/
```

Otros scripts útiles: `pnpm lint` / `pnpm lint:fix` (ESLint), `pnpm format` (Prettier), `pnpm typecheck` (`vue-tsc`), `pnpm test` (Vitest), y `cargo test` dentro de `src-tauri/` para los tests de Rust.

### Seguridad

- `security.csp` en `src-tauri/tauri.conf.json` está fijada explícitamente (no `null`): solo permite código/estilos propios, recursos servidos por el protocolo local de Tauri (incluido `ipc:`, necesario para que `invoke()` funcione), y los hosts externos puntuales que la app contacta (IP pública, chequeo de actualizaciones).
- `src-tauri/capabilities/default.json` lista únicamente los permisos que el código realmente usa — cada entrada se puede rastrear a un `invoke()`/plugin concreto en `src/`.
- `.github/workflows/dependency-audit.yml` corre `cargo audit` y `pnpm audit` en cada push/PR a `main` y una vez por semana, para detectar CVEs en dependencias.
- Los paquetes de actualización se firman con una clave `minisign` propia (la privada nunca vive en el repositorio) — la app rechaza instalar cualquier update cuya firma no coincida.

### Cómo ayudar

Es un proyecto personal, pero las contribuciones son bienvenidas: forkeá, corré `pnpm install`, y antes de mandar un PR asegurate de que pasen `pnpm typecheck`, `pnpm lint`, `pnpm test` y (si tocaste código de Rust) `cargo test` dentro de `src-tauri/`. Los comentarios de código del proyecto están en español — mantené esa convención en los cambios que aportes.

## Legal y créditos

- **Licencia**: [GNU GPL v3](LICENSE). Cualquier redistribución, modificada o no, debe mantenerse bajo la misma licencia y con el código fuente disponible.
- **Inspiración**: la interfaz táctil y la estética cyberpunk están fuertemente inspiradas en el concepto original de **eDEX-UI**, creado por Gabriel "Squared" Saillard — un proyecto hoy archivado que sirvió como referencia funcional y visual. El código de darkwind_ui es una reimplementación completa desde cero (no un fork ni una copia directa de código).
- **GeoLite2**: este producto incluye datos de GeoLite2 creados por MaxMind, disponibles en https://www.maxmind.com.
