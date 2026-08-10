# darkwind_ui

Terminal de escritorio con estética cyberpunk, construido desde cero con **Vue 3 + TypeScript + Tauri v2 (Rust)**.

## Estado del proyecto

🚧 En desarrollo activo. Infraestructura base, terminal y paneles de sistema ya operativos: persistencia de configuración, sistema de temas, animación de arranque, layout principal, una terminal real (PowerShell) multi-pestaña con PTY nativo en Rust, y los paneles laterales de reloj, CPU, RAM, GPU, procesos, red y GeoIP con datos en vivo. Explorador de archivos, teclado táctil y globo 3D aún en construcción.

## Características

### Implementado

- Terminal real (shell) vía PTY nativo en Rust, multi-tab (hasta 5 pestañas)
- Búsqueda en el scrollback de la terminal (Ctrl+F) — el original no tiene esto
- Paneles de sistema en vivo: reloj, CPU (global, por núcleo, frecuencia y temperatura), RAM (mapa de 440 celdas en canvas) + swap, discos, batería (con tiempo restante), procesos activos (con ruta del ejecutable y línea de comandos) y red
- Panel de red enriquecido: IP externa + ubicación (país/ciudad) + ISP (organización ASN), IP local por interfaz, y conexiones TCP activas con el nombre del proceso y la organización dueña de cada IP remota — no solo la IP pelada
- Panel de GPU (uso/VRAM/temperatura), soporte multi-fabricante real (NVIDIA, AMD, Intel) — el original solo reportaba CPU/RAM, nunca GPU
- Polling de sysinfo centralizado en un store — evita las llamadas redundantes que el original hacía por cada panel por separado
- Tooltips explicativos en los datos técnicos de los paneles de sistema (Swap, PID, ISP, VRAM, etc.) y tamaños de RAM/VRAM en unidades binarias reales (16 GiB se muestra "16 GB", no "17.2 GB" — la misma convención que usa Windows)
- Temas personalizables (JSON + variables CSS)

### Planeado (roadmap)

- Explorador de archivos integrado, sincronizado con la terminal activa (Fase 4)
- Teclado táctil multi-idioma con dead-keys (Fase 4)
- Interfaz en inglés o español, con detección automática del idioma del sistema (Fase 5)
- Globo 3D con visualización de conexiones de red activas (Fase 6)

### Limitaciones conocidas

- Alcance actual: **solo Windows**.
- GeoIP funciona de fábrica para cualquier usuario final: las bases `GeoLite2-City.mmdb`, `GeoLite2-ASN.mmdb` y `GeoLite2-Country.mmdb` viajan empaquetadas dentro del instalador. Para **compilar** el proyecto vos mismo hace falta colocar las tres antes (ver `src-tauri/resources/geoip/README.md`) — sin ellas, `pnpm tauri dev`/`pnpm tauri build` fallan al no encontrar los recursos declarados.
- La temperatura de CPU/GPU depende de sensores y drivers expuestos por el sistema — en algunos equipos (especialmente laptops) puede no estar disponible ("best-effort", igual que en el original).

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
