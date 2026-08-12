import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { Feature, Geometry, GeoJsonProperties } from "geojson";
import worldTopology from "world-atlas/countries-110m.json";

// Datos empaquetados con la app (110m de resolución de Natural Earth, ~105 KB) — NO se
// descargan en runtime. La resolución 110m alcanza de sobra para distinguir
// continentes/países a la escala en la que se ve el globo (panel de 17vw o modal
// expandido), y evita la dependencia de red que tendría bajar un GeoJSON externo cada
// vez (mismo criterio que ya se usó para empaquetar las bases de GeoIP, Sección 6.3).
let cachedFeatures: Feature<Geometry, GeoJsonProperties>[] | null = null;

export function loadCountryFeatures(): Feature<Geometry, GeoJsonProperties>[] {
  if (!cachedFeatures) {
    const topology = worldTopology as unknown as Topology;
    const collection = feature(topology, topology.objects.countries as GeometryCollection);
    cachedFeatures = collection.features;
  }
  return cachedFeatures;
}
