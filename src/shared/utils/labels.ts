import { i18n } from "@/core/i18n/i18n";

// El backend Rust serializa estados de enums con `format!("{:?}", ...)` (nombres de
// variante en inglés, ej. "Discharging", "Established") — se traduce acá, en la capa
// de presentación, contra el idioma activo de la app (no en Rust, para no acoplar el
// formato de datos serializados al idioma de la UI).
const BATTERY_STATE_KEYS: Record<string, string> = {
  Charging: "labels.batteryCharging",
  Discharging: "labels.batteryDischarging",
  Full: "labels.batteryFull",
  Empty: "labels.batteryEmpty",
  Unknown: "labels.batteryUnknown",
};

export function batteryStateLabel(state: string): string {
  const key = BATTERY_STATE_KEYS[state];
  return key ? String(i18n.global.t(key)) : state;
}

const TCP_STATE_KEYS: Record<string, string> = {
  Established: "labels.tcpEstablished",
};

export function tcpStateLabel(state: string): string {
  const key = TCP_STATE_KEYS[state];
  return key ? String(i18n.global.t(key)) : state;
}
