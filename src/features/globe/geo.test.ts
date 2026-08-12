import { describe, expect, it } from "vitest";
import { buildConnectionArcs, buildConnectionPoints, isPublicIp, uniquePublicRemoteIps } from "./geo";

describe("isPublicIp", () => {
  it("rechaza rangos IPv4 privados/loopback/link-local", () => {
    expect(isPublicIp("10.0.0.5")).toBe(false);
    expect(isPublicIp("192.168.1.20")).toBe(false);
    expect(isPublicIp("127.0.0.1")).toBe(false);
    expect(isPublicIp("169.254.1.1")).toBe(false);
    expect(isPublicIp("172.16.0.1")).toBe(false);
    expect(isPublicIp("172.31.255.255")).toBe(false);
    expect(isPublicIp("0.0.0.0")).toBe(false);
  });

  it("acepta IPv4 públicas, incluidas las cercanas al rango privado 172.x", () => {
    expect(isPublicIp("8.8.8.8")).toBe(true);
    expect(isPublicIp("1.1.1.1")).toBe(true);
    expect(isPublicIp("172.15.255.255")).toBe(true);
    expect(isPublicIp("172.32.0.0")).toBe(true);
  });

  it("rechaza IPv6 loopback/link-local/unique-local", () => {
    expect(isPublicIp("::1")).toBe(false);
    expect(isPublicIp("::")).toBe(false);
    expect(isPublicIp("fe80::1")).toBe(false);
    expect(isPublicIp("fc00::1")).toBe(false);
    expect(isPublicIp("fd12:3456::1")).toBe(false);
  });

  it("acepta IPv6 pública y resuelve IPv4-mapped-en-IPv6", () => {
    expect(isPublicIp("2001:4860:4860::8888")).toBe(true);
    expect(isPublicIp("::ffff:192.168.1.1")).toBe(false);
    expect(isPublicIp("::ffff:8.8.8.8")).toBe(true);
  });

  it("rechaza cadenas vacías", () => {
    expect(isPublicIp("")).toBe(false);
    expect(isPublicIp("   ")).toBe(false);
  });
});

describe("uniquePublicRemoteIps", () => {
  it("deduplica y filtra IPs privadas de la lista de conexiones", () => {
    const result = uniquePublicRemoteIps([
      { remoteAddr: "8.8.8.8" },
      { remoteAddr: "8.8.8.8" },
      { remoteAddr: "192.168.1.1" },
      { remoteAddr: "1.1.1.1" },
    ]);
    expect(result).toEqual(["8.8.8.8", "1.1.1.1"]);
  });

  it("devuelve un array vacío si no hay conexiones públicas", () => {
    expect(uniquePublicRemoteIps([{ remoteAddr: "127.0.0.1" }])).toEqual([]);
  });
});

describe("buildConnectionPoints / buildConnectionArcs", () => {
  const geos = new Map([
    ["8.8.8.8", { lat: 37.4, lng: -122.1 }],
    ["1.1.1.1", null],
  ]);

  it("solo incluye IPs activas con geolocalización resuelta", () => {
    const points = buildConnectionPoints(["8.8.8.8", "1.1.1.1"], geos);
    expect(points).toEqual([{ id: "8.8.8.8", lat: 37.4, lng: -122.1, kind: "connection" }]);
  });

  it("arma un arco desde la ubicación propia hasta cada conexión activa geolocalizada", () => {
    const arcs = buildConnectionArcs({ lat: 10, lng: 20 }, ["8.8.8.8", "1.1.1.1"], geos);
    expect(arcs).toEqual([{ ip: "8.8.8.8", startLat: 10, startLng: 20, endLat: 37.4, endLng: -122.1 }]);
  });

  it("sin ubicación propia no arma ningún arco (no hay origen)", () => {
    expect(buildConnectionArcs(null, ["8.8.8.8"], geos)).toEqual([]);
  });

  // Regresión: una versión anterior iteraba el Map de caché completo en vez de la
  // lista de IPs activas — una conexión ya cerrada (pero todavía en el caché porque
  // nunca se limpiaba) se seguía dibujando en el globo para siempre.
  it("ignora IPs presentes en el caché pero que ya no están entre las conexiones activas", () => {
    const staleCache = new Map([
      ["8.8.8.8", { lat: 37.4, lng: -122.1 }],
      ["203.0.113.9", { lat: -33.8, lng: 151.2 }], // conexión cerrada, cacheada de antes
    ]);
    const points = buildConnectionPoints(["8.8.8.8"], staleCache);
    expect(points).toEqual([{ id: "8.8.8.8", lat: 37.4, lng: -122.1, kind: "connection" }]);

    const arcs = buildConnectionArcs({ lat: 10, lng: 20 }, ["8.8.8.8"], staleCache);
    expect(arcs).toHaveLength(1);
    expect(arcs[0].ip).toBe("8.8.8.8");
  });
});
