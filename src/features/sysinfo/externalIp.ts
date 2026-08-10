// Igual que el original (que también resolvía la IP externa contra un servicio HTTP
// público), pero acá se hace directo desde el frontend con fetch(): no hace falta
// sumar un cliente HTTP en Rust solo para esto, y la CSP del scaffold (todavía en
// "null", sin endurecer) no lo bloquea.
export async function fetchExternalIp(): Promise<string | null> {
  try {
    const response = await fetch("https://api.ipify.org?format=json", {
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { ip?: unknown };
    return typeof data.ip === "string" ? data.ip : null;
  } catch {
    return null;
  }
}
