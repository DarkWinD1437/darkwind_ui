import prettyBytes from "pretty-bytes";

export function formatBytes(bytes: number): string {
  return prettyBytes(bytes);
}

export function formatBytesPerSec(bytes: number): string {
  return `${prettyBytes(bytes)}/s`;
}

// La RAM/VRAM se fabrica en potencias de 2 (un módulo "de 16GB" son físicamente
// 16 * 1024^3 bytes) — mostrado en decimal (lo que hace formatBytes) da "17.2 GB" y
// parece un error. No es redondeo: es la unidad binaria (GiB) correcta para memoria,
// simplemente con la etiqueta familiar "GB" en vez de "GiB" (que gran parte de los
// usuarios no reconoce). Se usa para RAM, swap, VRAM y memoria por proceso — NO para
// discos ni tráfico de red, que sí se venden/miden en GB decimales reales.
export function formatMemoryBytes(bytes: number): string {
  return prettyBytes(bytes, { binary: true }).replace(/i?B$/, "B");
}

// Para tooltips: el valor exacto en bytes, con separador de miles, para quien quiera
// el número preciso detrás del "16 GB" redondeado.
export function formatExactBytes(bytes: number): string {
  return `${bytes.toLocaleString("es")} bytes`;
}

export function formatUptime(totalSeconds: number): string {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
