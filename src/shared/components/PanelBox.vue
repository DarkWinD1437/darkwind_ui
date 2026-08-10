<script setup lang="ts">
import { ref } from "vue";

// `expandable`: agrega un modal más grande (más ancho, letra más grande) con el mismo
// contenido del panel, para paneles donde el recuadro compacto de la columna lateral
// (17vw, letra ~0.85vh) queda difícil de leer. El slot recibe `expanded` por si el
// panel necesita mostrar MÁS datos en el modal que en la vista compacta (ej.
// NetstatPanel: 3 conexiones en línea, todas en el modal) — los paneles que no lo
// necesitan pueden ignorarlo y usar el slot normal, sin cambios.
defineProps<{ title: string; expandable?: boolean }>();
const expanded = ref(false);
</script>

<template>
  <div class="panel-box">
    <h4
      class="panel-box-title"
      :class="{ expandable }"
      :title="expandable ? 'Click para ver esta sección más grande' : undefined"
      @click="expandable && (expanded = true)"
    >
      {{ title }}
    </h4>
    <!--
      Un solo <slot>, nunca dos: si el compacto y el modal invocaran el slot por
      separado (ej. con v-if/v-else), Vue destruiría y recrearía el contenido al
      alternar, y paneles con <canvas> (RAM, sparklines) perderían su ResizeObserver/
      referencia configurados una sola vez en su propio onMounted — quedarían en
      blanco después de cerrar el modal. Con Teleport + :disabled, es el MISMO nodo
      DOM el que se reubica entre el lugar compacto y <body>, nunca se recrea.
    -->
    <Teleport to="body" :disabled="!expanded">
      <div
        :class="expanded ? 'panel-box-overlay' : 'panel-box-inline'"
        @click.self="expanded = false"
      >
        <div
          :class="expanded ? 'panel-box-modal' : ''"
          :data-augmented-ui="expanded ? 'tr-clip bl-clip border' : null"
        >
          <div v-if="expanded" class="panel-box-modal-header">
            <span>{{ title }}</span>
            <button type="button" title="Cerrar" @click="expanded = false">✕</button>
          </div>
          <!--
            El scroll vive en un wrapper APARTE del elemento con el borde recortado de
            augmented-ui: ese borde se dibuja con un pseudo-elemento pensado para un
            marco fijo, no para un contenedor con overflow-y propio — con los dos en el
            mismo elemento, el marco terminaba "viajando" con el contenido al scrollear
            en vez de quedarse fijo alrededor. Separado así, el marco nunca se mueve y
            solo el contenido de adentro se desliza.
          -->
          <div :class="expanded ? 'panel-box-modal-scroll' : ''">
            <div class="panel-box-body" :class="{ 'panel-box-body-expanded': expanded }">
              <slot :expanded="expanded" />
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.panel-box {
  width: 100%;
  box-sizing: border-box;
  border: 0.09vh solid rgba(var(--color_r), var(--color_g), var(--color_b), 0.35);
  background: rgba(var(--color_r), var(--color_g), var(--color_b), 0.04);
  margin-bottom: 0.9vh;
  padding: 0.5vh 0.7vh;
  font-family: var(--font_main), sans-serif;
}

.panel-box-title {
  margin: 0 0 0.4vh 0;
  font-size: 0.85vh;
  font-weight: normal;
  letter-spacing: 0.05vh;
  opacity: 0.75;
  border-bottom: 0.09vh solid rgba(var(--color_r), var(--color_g), var(--color_b), 0.25);
  padding-bottom: 0.3vh;
  text-transform: uppercase;
}
.panel-box-title.expandable {
  cursor: pointer;
}
.panel-box-title.expandable:hover {
  opacity: 1;
  color: rgb(var(--color_r), var(--color_g), var(--color_b));
}
.panel-box-title.expandable::after {
  content: " ⤢";
}

.panel-box-body {
  font-size: 0.85vh;
}

.panel-box-inline {
  display: contents;
}

.panel-box-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.panel-box-modal {
  --aug-border-all: 0.18vh;
  --aug-border-bg: rgb(var(--color_r), var(--color_g), var(--color_b));
  background: var(--color_light_black);
  color: rgb(var(--color_r), var(--color_g), var(--color_b));
  /* Ancho fijo (no min/max-width dependiendo del contenido): un panel con <canvas> al
     100% de ancho adentro de un contenedor sin ancho propio (shrink-to-fit) puede
     entrar en un ciclo de redimensionado ida y vuelta con su ResizeObserver — con un
     ancho fijo no hay ambigüedad de layout que resolver, así que no hay ciclo posible. */
  width: 44vw;
  max-width: 90vw;
  max-height: 78vh;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  padding: 1.4vh 1.8vh;
  font-family: var(--font_main), sans-serif;
}
.panel-box-modal-scroll {
  /* flex:1 + min-height:0 es lo que le permite a un hijo de un flex column scrollear
     adentro de su propio espacio en vez de simplemente estirar al padre sin límite. */
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}
/* Scrollbar propia con los colores del tema en vez de la barra gris nativa de
   Windows/Chromium, que desentonaba con el resto de la estética. */
.panel-box-modal-scroll::-webkit-scrollbar {
  width: 0.7vh;
}
.panel-box-modal-scroll::-webkit-scrollbar-track {
  background: rgba(var(--color_r), var(--color_g), var(--color_b), 0.08);
}
.panel-box-modal-scroll::-webkit-scrollbar-thumb {
  background: rgba(var(--color_r), var(--color_g), var(--color_b), 0.4);
}
.panel-box-modal-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(var(--color_r), var(--color_g), var(--color_b), 0.65);
}
.panel-box-modal-header {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.2vh;
  font-size: 1.7vh;
  text-transform: uppercase;
  border-bottom: 0.09vh solid rgba(var(--color_r), var(--color_g), var(--color_b), 0.3);
  padding-bottom: 0.6vh;
}
.panel-box-modal-header button {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 1.3vh;
}
.panel-box-body-expanded {
  font-size: 2.2vh;
}
</style>
