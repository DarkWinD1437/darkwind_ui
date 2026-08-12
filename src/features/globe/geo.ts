// Funciones puras (sin DOM/WebGL) para transformar conexiones TCP + datos GeoIP en
// puntos/arcos del globo 3D — separadas de globeEngine.ts para poder testearlas con
// Vitest sin necesitar un contexto WebGL real.

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GlobePointDatum extends GeoPoint {
  id: string;
  kind: "self" | "connection";
}

export interface GlobeArcDatum {
  ip: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
}

const IPV4_PRIVATE_PREFIXES = ["10.", "127.", "192.168.", "169.254.", "0."];

function isPrivateIpv4(ip: string): boolean {
  if (IPV4_PRIVATE_PREFIXES.some((prefix) => ip.startsWith(prefix))) return true;
  const match = ip.match(/^172\.(\d+)\./);
  if (!match) return false;
  const secondOctet = Number(match[1]);
  return secondOctet >= 16 && secondOctet <= 31;
}

// El globo solo tiene sentido geolocalizando IPs públicas — direcciones privadas/
// loopback/link-local (LAN, Docker, VPN local) no están en ninguna base GeoIP y
// desperdiciarían una consulta que siempre va a devolver null.
export function isPublicIp(rawIp: string): boolean {
  const ip = rawIp.trim();
  if (!ip) return false;

  if (ip.includes(".") && !ip.includes(":")) return !isPrivateIpv4(ip);

  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return false;
  if (lower.startsWith("fe80:") || lower.startsWith("fc") || lower.startsWith("fd")) return false;

  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return !isPrivateIpv4(mapped[1]);

  return true;
}

export function uniquePublicRemoteIps(connections: { remoteAddr: string }[]): string[] {
  const seen = new Set<string>();
  for (const conn of connections) {
    if (isPublicIp(conn.remoteAddr)) seen.add(conn.remoteAddr);
  }
  return [...seen];
}

// `activeIps` manda cuáles conexiones se muestran (siempre las de AHORA); `geos` es
// solo un caché de lookups ya resueltos, no la fuente de verdad — iterar el caché
// directamente (como hacía la versión anterior) dejaba pines/arcos de conexiones ya
// cerradas dibujados para siempre, porque nunca se sacaban del Map.
export function buildConnectionPoints(
  activeIps: string[],
  geos: Map<string, GeoPoint | null>,
): GlobePointDatum[] {
  const points: GlobePointDatum[] = [];
  for (const ip of activeIps) {
    const geo = geos.get(ip);
    if (!geo) continue;
    points.push({ id: ip, lat: geo.lat, lng: geo.lng, kind: "connection" });
  }
  return points;
}

export function buildConnectionArcs(
  own: GeoPoint | null,
  activeIps: string[],
  geos: Map<string, GeoPoint | null>,
): GlobeArcDatum[] {
  if (!own) return [];
  const arcs: GlobeArcDatum[] = [];
  for (const ip of activeIps) {
    const geo = geos.get(ip);
    if (!geo) continue;
    arcs.push({ ip, startLat: own.lat, startLng: own.lng, endLat: geo.lat, endLng: geo.lng });
  }
  return arcs;
}
