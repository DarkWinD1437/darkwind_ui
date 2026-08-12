<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import PanelBox from "@/shared/components/PanelBox.vue";
import { useSysinfoStore } from "@/features/sysinfo/stores/sysinfo.store";
import { useSettingsStore } from "@/features/settings/stores/settings.store";
import { useThemesStore } from "@/core/theme/stores/themes.store";
import { geoipLookup } from "@/features/sysinfo/sysinfoClient";
import { createGlobeEngine, type GlobeEngineHandle } from "../globeEngine";
import {
  buildConnectionArcs,
  buildConnectionPoints,
  uniquePublicRemoteIps,
  type GeoPoint,
  type GlobePointDatum,
} from "../geo";

const { t } = useI18n();
const sysinfoStore = useSysinfoStore();
const settingsStore = useSettingsStore();
const themesStore = useThemesStore();

const containerRef = ref<HTMLElement | null>(null);
let engine: GlobeEngineHandle | null = null;
const engineFailed = ref(false);

// Map mutable (no reactivo por sí solo) cacheando lookups GeoIP ya resueltos por IP —
// geoCacheTick fuerza a los `computed` de abajo a recalcular cuando el cache cambia,
// sin tener que convertir el Map entero en estado reactivo de Vue.
const geoCache = new Map<string, GeoPoint | null>();
const geoCacheTick = ref(0);

// Los pines/arcos de conexiones activas son la mejora experimental sobre el original
// (Sección 6.2 del plan) — el globo base (ubicación propia + grid) se ve siempre.
const connectionsEnabled = computed(() => settingsStore.current?.experimentalGlobeFeatures ?? false);

const ownGeo = computed<GeoPoint | null>(() => {
  const geo = sysinfoStore.externalIpGeo;
  if (!geo || geo.latitude === null || geo.longitude === null) return null;
  return { lat: geo.latitude, lng: geo.longitude };
});

const isOffline = computed(() => !ownGeo.value);

const latLonLabel = computed(() => {
  if (!ownGeo.value) return t("panels.globe.unknown");
  return `${ownGeo.value.lat.toFixed(4)}, ${ownGeo.value.lng.toFixed(4)}`;
});

// Fuente de verdad de "qué IPs mostrar" — SIEMPRE las conexiones activas ahora mismo,
// nunca todo lo que haya pasado por geoCache (ver buildConnectionPoints/Arcs en
// geo.ts): geoCache es solo una memoización de lookups ya resueltos para no volver a
// pedirle geoip_lookup a una IP que ya se consultó, no la lista de qué dibujar.
const activePublicIps = computed(() => uniquePublicRemoteIps(sysinfoStore.netConnections));

async function refreshConnectionGeo(): Promise<void> {
  if (!connectionsEnabled.value) return;
  const pending = activePublicIps.value.filter((ip) => !geoCache.has(ip));
  if (pending.length === 0) return;

  await Promise.all(
    pending.map(async (ip) => {
      const geo = await geoipLookup(ip).catch(() => null);
      geoCache.set(
        ip,
        geo && geo.latitude !== null && geo.longitude !== null ? { lat: geo.latitude, lng: geo.longitude } : null,
      );
    }),
  );
  geoCacheTick.value++;
}

const connectionPoints = computed<GlobePointDatum[]>(() => {
  void geoCacheTick.value;
  return connectionsEnabled.value ? buildConnectionPoints(activePublicIps.value, geoCache) : [];
});

const connectionArcs = computed(() => {
  void geoCacheTick.value;
  return connectionsEnabled.value ? buildConnectionArcs(ownGeo.value, activePublicIps.value, geoCache) : [];
});

const allPoints = computed<GlobePointDatum[]>(() => {
  const self: GlobePointDatum[] = ownGeo.value
    ? [{ id: "self", lat: ownGeo.value.lat, lng: ownGeo.value.lng, kind: "self" }]
    : [];
  return [...self, ...connectionPoints.value];
});

watch(allPoints, (points) => engine?.setPoints(points));
watch(connectionArcs, (arcs) => engine?.setArcs(arcs));
// Sin `deep: true`: sysinfo.store.ts SIEMPRE reemplaza `netConnections` por un array
// nuevo en cada poll (nunca lo muta in-place), así que un watch superficial ya
// detecta cada cambio real — `deep` solo sumaba una recorrida completa de cada
// conexión, en cada poll de 5s, durante toda la sesión, sin ningún beneficio.
watch(
  () => sysinfoStore.netConnections,
  () => void refreshConnectionGeo(),
);
watch(connectionsEnabled, (enabled) => {
  if (enabled) void refreshConnectionGeo();
});
watch(
  () => themesStore.current,
  (theme) => {
    if (theme) engine?.setTheme(theme);
  },
);

onMounted(() => {
  if (!containerRef.value) return;
  // Un contexto WebGL puede no estar disponible (drivers viejos, sesiones RDP/VM sin
  // GPU) — sin este try/catch, el panel quedaba con un `<div>` vacío sin ninguna
  // explicación en vez de avisar que el globo no puede renderizar acá.
  try {
    engine = createGlobeEngine(containerRef.value);
  } catch {
    engineFailed.value = true;
    return;
  }
  if (themesStore.current) engine.setTheme(themesStore.current);
  engine.setPoints(allPoints.value);
  engine.setArcs(connectionArcs.value);
  void refreshConnectionGeo();
});

onBeforeUnmount(() => {
  engine?.dispose();
  engine = null;
});
</script>

<template>
  <PanelBox v-slot="{ expanded }" :title="t('panels.globe.title')" expandable>
    <div class="globe-header">
      <span class="globe-subtitle">{{ t("panels.globe.subtitle") }}</span>
      <span class="globe-endpoint" :title="t('panels.globe.endpointTooltip')">
        {{ t("panels.globe.endpointLabel") }} {{ latLonLabel }}
      </span>
    </div>

    <div
      ref="containerRef"
      class="globe-canvas"
      :class="{ offline: isOffline, 'globe-canvas-expanded': expanded }"
      data-testid="globe-canvas"
    ></div>

    <p v-if="engineFailed" class="globe-hint globe-offline">{{ t("panels.globe.webglUnavailable") }}</p>
    <p v-else-if="isOffline" class="globe-hint globe-offline">{{ t("panels.globe.offline") }}</p>
    <p v-else-if="connectionsEnabled" class="globe-hint">
      {{ t("panels.globe.connectionsHint", { count: connectionArcs.length }) }}
    </p>
    <p v-else class="globe-hint">{{ t("panels.globe.enableHint") }}</p>

    <p v-if="expanded" class="globe-drag-hint">{{ t("panels.globe.dragHint") }}</p>
  </PanelBox>
</template>

<style scoped>
.globe-header {
  display: flex;
  flex-direction: column;
  gap: 0.1vh;
  margin-bottom: 0.4vh;
}
.globe-subtitle {
  opacity: 0.6;
  font-size: 0.85em;
}
.globe-endpoint {
  opacity: 0.85;
}
.globe-canvas {
  /* Alto fijo (no aspect-ratio 1:1) en la vista compacta: un cuadrado a 17vw de ancho
     resultaba más alto que el resto de los paneles de la columna juntos, empujando el
     contenido de más abajo hasta taparse con el teclado. En el modal expandido sí se
     usa un alto generoso porque ahí hay espacio de sobra (panel-box-modal ya limita a
     max-height:78vh). */
  width: 100%;
  height: 13vh;
  overflow: hidden;
  position: relative;
  border: 0.09vh solid rgba(var(--color_r), var(--color_g), var(--color_b), 0.2);
  transition:
    opacity 0.4s ease,
    height 0.3s ease;
}
.globe-canvas-expanded {
  height: 46vh;
}
.globe-canvas.offline {
  opacity: 0.45;
  filter: grayscale(0.6);
}
.globe-hint {
  margin: 0.4vh 0 0;
  opacity: 0.55;
  font-size: 0.85em;
}
.globe-offline {
  color: rgb(var(--color_r), var(--color_g), var(--color_b));
  opacity: 0.8;
}
.globe-drag-hint {
  margin: 0.6vh 0 0;
  opacity: 0.45;
  font-size: 0.8em;
  text-align: center;
}
</style>
