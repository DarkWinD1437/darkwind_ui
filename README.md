# darkwind_ui

Terminal de escritorio con estética cyberpunk, construido desde cero con **Vue 3 + TypeScript + Tauri v2 (Rust)**.

## Estado del proyecto

🚧 En desarrollo. La arquitectura, el stack, las fases de construcción y todas las decisiones técnicas tomadas hasta ahora están documentadas en [`plan_migracion.txt`](./plan_migracion.txt) — es el documento de referencia del proyecto y se actualiza cada vez que se toma una decisión nueva o cambia el alcance.

## Características (según lo planeado en `plan_migracion.txt`)

- Terminal real (shell) vía PTY nativo en Rust, multi-tab
- Paneles de sistema en vivo: CPU, RAM, procesos, red, batería, GeoIP
- Temas personalizables (JSON + variables CSS)
- Teclado táctil multi-idioma con dead-keys
- Explorador de archivos integrado, sincronizado con la terminal activa
- Globo 3D con visualización de conexiones de red activas

### Limitaciones conocidas

- ⚠ **El panel de GPU (uso/temperatura) está disponible por ahora solo en tarjetas NVIDIA** (vía NVIDIA NVML). Un camino universal para AMD/Intel usando los contadores de rendimiento de Windows está evaluado pero todavía no implementado — ver `plan_migracion.txt`, Sección 6.9 y Sección 15 (pregunta abierta #10).
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

## Documentación

Todo el detalle técnico vive en [`plan_migracion.txt`](./plan_migracion.txt): arquitectura de carpetas, stack tecnológico, mapeo pieza por pieza del proyecto original, fases de construcción con estimados, y el historial de decisiones (Secciones 14 y 15). Se mantiene como documento vivo — revisarlo antes de tomar decisiones de arquitectura nuevas para no duplicar ni contradecir lo ya definido.
