// El backend Rust serializa estados de enums con `format!("{:?}", ...)` (nombres de
// variante en inglés, ej. "Discharging", "Established") — correcto para depurar, pero
// se filtraba tal cual a una UI en español. Se traduce acá, en la capa de
// presentación, en vez de en Rust, para no acoplar el formato de datos al idioma.
const BATTERY_STATE_ES: Record<string, string> = {
  Charging: "Cargando",
  Discharging: "Descargando",
  Full: "Completa",
  Empty: "Vacía",
  Unknown: "Desconocido",
};

export function batteryStateLabel(state: string): string {
  return BATTERY_STATE_ES[state] ?? state;
}

const TCP_STATE_ES: Record<string, string> = {
  Established: "Establecida",
};

export function tcpStateLabel(state: string): string {
  return TCP_STATE_ES[state] ?? state;
}
