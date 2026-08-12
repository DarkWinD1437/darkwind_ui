import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import ThreeGlobe from "three-globe";
import type { DarkwindTheme } from "@/core/theme/theme.schema";
import type { GlobeArcDatum, GlobePointDatum } from "./geo";
import { loadCountryFeatures } from "./countries";

// theme.schema.ts valida `globe.*` como `z.string()` sin exigir formato hex — un tema
// custom (o uno nuevo del catálogo) podría usar "rgb(...)"/nombres CSS. Concatenar un
// sufijo de 2 dígitos asumiendo "#rrggbb" rompía en silencio para cualquier otro
// formato; pasar por THREE.Color acepta lo que three.js entienda como color CSS y
// arma el rgba() a mano, sin asumir el formato de entrada.
function withAlpha(cssColor: string, alpha: number): string {
  const c = new THREE.Color(cssColor);
  return `rgba(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}, ${alpha})`;
}

const SATELLITE_COUNT = 6;

interface SatelliteDatum {
  lat: number;
  lng: number;
  alt: number;
}

function randomConstellation(): SatelliteDatum[] {
  return Array.from({ length: SATELLITE_COUNT }, () => ({
    lat: Math.random() * 140 - 70,
    lng: Math.random() * 360 - 180,
    alt: 1.35 + Math.random() * 0.35,
  }));
}

export interface GlobeEngineHandle {
  setTheme(theme: DarkwindTheme): void;
  setPoints(points: GlobePointDatum[]): void;
  setArcs(arcs: GlobeArcDatum[]): void;
  dispose(): void;
}

// Reemplaza a encom-globe.js (vendored, sin paquete npm, sin tipos, sin mantenimiento
// desde ~2017) por three-globe: mantenido activamente, con tipos TS. Los continentes
// se dibujan con datos de Natural Earth empaquetados con la app (ver countries.ts) —
// nunca se descarga nada en tiempo de ejecución (ver plan_migracion.txt, Sección 6.4 y
// 19.20, para el detalle de esta decisión y de la ronda de pulido que la corrigió).
export function createGlobeEngine(container: HTMLElement): GlobeEngineHandle {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 2000);
  camera.position.set(0, 0, 280);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 1.4));
  const pointLight = new THREE.PointLight(0xffffff, 0.5);
  pointLight.position.set(-300, 200, 300);
  scene.add(pointLight);

  const globe = new ThreeGlobe()
    .showGlobe(true)
    .showGraticules(true)
    .showAtmosphere(true)
    .atmosphereAltitude(0.2)
    // Continentes/países reales (Natural Earth 110m, empaquetado con la app — ver
    // countries.ts) como polígonos sólidos extruidos, NO como mosaico de hexágonos:
    // sin esto el globo era una esfera lisa donde no se distinguía tierra de océano,
    // solo la grilla de latitud/longitud. Se probó primero hexPolygonsData (mosaico de
    // hexágonos, el look más "sci-fi" típico de los demos de three-globe), pero tesela
    // cada país en cientos/miles de hexágonos individuales — en WebGL por software
    // (verificado con Chromium headless, el mismo motor que corre sin aceleración de
    // hardware en una VM/RDP sin GPU) esa cantidad de geometría tiraba errores reales
    // de contexto WebGL. polygonsData usa UNA malla por país (~180 en vez de miles) —
    // mucho más liviano, y el contorno sólido es igual de legible para distinguir
    // continentes que el mosaico de hexágonos.
    .polygonsData(loadCountryFeatures())
    .polygonAltitude(0.008)
    .polygonsTransitionDuration(0)
    .pointAltitude(0.02)
    // El punto propio ("acá estás vos") se dibuja más grande que los de conexiones
    // remotas — sin este contraste de tamaño, con colores de tema similares, era casi
    // imposible distinguir cuál punto era el propio en un vistazo rápido.
    .pointRadius((d) => ((d as GlobePointDatum).kind === "self" ? 0.75 : 0.45))
    .arcAltitudeAutoScale(0.35)
    .arcStroke(0.9)
    .arcDashLength(0.55)
    .arcDashGap(0.6)
    .arcDashAnimateTime(3200)
    .ringMaxRadius(6)
    .ringPropagationSpeed(2.2)
    .ringRepeatPeriod(1400)
    .customLayerData(randomConstellation())
    .customThreeObjectUpdate((obj, datum) => {
      const { lat, lng, alt } = datum as SatelliteDatum;
      Object.assign(obj.position, globe.getCoords(lat, lng, alt));
    });
  scene.add(globe);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.minDistance = 150;
  controls.maxDistance = 520;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.55;

  // Pausa la auto-rotación mientras el usuario arrastra (si no, OrbitControls sigue
  // sumando su propia rotación por-frame ENCIMA del gesto del usuario, y el globo
  // "pelea" contra la mano) y la retoma sola a los 4s de soltar — mejora de
  // interactividad que el original nunca tuvo (encom-globe no permitía arrastrar).
  let resumeAutoRotateTimer: ReturnType<typeof setTimeout> | null = null;
  controls.addEventListener("start", () => {
    controls.autoRotate = false;
    if (resumeAutoRotateTimer) clearTimeout(resumeAutoRotateTimer);
  });
  controls.addEventListener("end", () => {
    resumeAutoRotateTimer = setTimeout(() => {
      controls.autoRotate = true;
    }, 4000);
  });

  let frameId = 0;
  function animate(): void {
    controls.update();
    renderer.render(scene, camera);
    frameId = requestAnimationFrame(animate);
  }
  animate();

  function resize(): void {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width === 0 || height === 0) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();

  return {
    setTheme(theme: DarkwindTheme): void {
      const material = globe.globeMaterial() as THREE.MeshPhongMaterial;
      material.color = new THREE.Color(theme.globe.base);
      material.transparent = true;
      material.opacity = 0.82;

      globe.atmosphereColor(theme.globe.marker);
      // Opacidad media a propósito: los continentes son contexto geográfico, no el
      // dato importante — con el mismo brillo que los puntos/arcos de conexiones
      // reales, competían visualmente en vez de quedar de fondo.
      globe.polygonCapColor(() => withAlpha(theme.globe.marker, 0.33));
      globe.polygonSideColor(() => withAlpha(theme.globe.marker, 0.13));
      globe.polygonStrokeColor(() => theme.globe.marker);
      globe.pointColor((d) => ((d as GlobePointDatum).kind === "self" ? theme.globe.marker : theme.globe.pin));
      globe.arcColor(() => theme.globe.pin);
      globe.ringColor(() => (t: number) => {
        const c = new THREE.Color(theme.globe.marker);
        return `rgba(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}, ${1 - t})`;
      });

      const satelliteColor = new THREE.Color(theme.globe.satellite);
      globe.customThreeObject(
        () =>
          new THREE.Mesh(
            new THREE.SphereGeometry(0.55, 8, 8),
            new THREE.MeshBasicMaterial({ color: satelliteColor }),
          ),
      );
    },
    setPoints(points: GlobePointDatum[]): void {
      globe.pointsData(points);
      globe.ringsData(points.filter((p) => p.kind === "self"));
    },
    setArcs(arcs: GlobeArcDatum[]): void {
      globe.arcsData(arcs);
    },
    dispose(): void {
      cancelAnimationFrame(frameId);
      if (resumeAutoRotateTimer) clearTimeout(resumeAutoRotateTimer);
      resizeObserver.disconnect();
      controls.dispose();
      // scene.clear() solo desengancha los hijos del grafo de escena — NO libera la
      // geometría/material/textura de cada uno (footgun conocido de three.js). Sin
      // este recorrido, cada país (polygonsData), punto, arco y satélite quedaría con
      // su buffer de GPU sin liberar. Hoy GlobePanel vive montado toda la sesión (esto
      // nunca se ejecuta en la práctica), pero deja el motor seguro de recrear si
      // algún día el panel pasa a montarse/desmontarse con v-if.
      scene.traverse((obj) => {
        if (!(obj instanceof THREE.Mesh) && !(obj instanceof THREE.Line)) return;
        obj.geometry?.dispose();
        const material = obj.material;
        if (Array.isArray(material)) material.forEach((m) => m.dispose());
        else material?.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
      scene.clear();
    },
  };
}
