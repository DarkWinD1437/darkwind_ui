# darkwind_ui

Terminal de escritorio con estética cyberpunk, construido desde cero con **Vue 3 + TypeScript + Tauri v2 (Rust)**.

## Estado del proyecto

🚧 En desarrollo activo. Infraestructura base funcional: persistencia de configuración, sistema de temas, animación de arranque y layout principal ya operativos. Terminal, paneles de sistema, explorador de archivos y teclado táctil aún en construcción.

## Características

- Terminal real (shell) vía PTY nativo en Rust, multi-tab
- Paneles de sistema en vivo: CPU, RAM, procesos, red, batería, GeoIP
- Temas personalizables (JSON + variables CSS)
- Teclado táctil multi-idioma con dead-keys
- Interfaz en inglés o español, con detección automática del idioma del sistema
- Explorador de archivos integrado, sincronizado con la terminal activa
- Globo 3D con visualización de conexiones de red activas
- Panel de GPU (uso/temperatura), soporte multi-fabricante (NVIDIA, AMD, Intel)

### Limitaciones conocidas

- Alcance actual: **solo Windows**.

## Desarrollo

### Setup recomendado de IDE

- [VS Code](https://code.visualstudio.com/) + [Vue - Official](https://marketplace.visualstudio.com/items?itemName=Vue.volar) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

### Comandos

```bash
pnpm install
pnpm tauri dev     # modo desarrollo
pnpm tauri build   # genera el instalador
```

## Créditos e Inspiración

Este proyecto ha sido desarrollado desde cero utilizando Vue 3, Tauri y Rust. Su interfaz táctil y estética cyberpunk están fuertemente inspiradas en el concepto original de **eDEX-UI**, creado por Gabriel "Squared" Saillard — un proyecto hoy archivado que sirvió como referencia funcional y visual. El código de darkwind_ui es una reimplementación completa (no un fork ni una copia directa de código).
