import { onBeforeUnmount, onMounted, ref } from "vue";

const BASE_Z_INDEX = 300;
// Compartido por TODAS las instancias del composable (módulo, no reactive state por
// instancia): el contador de z-index tiene que ser uno solo para toda la app, si no
// dos modales de features distintas (ej. Settings y un modal de confirmación) podrían
// arrancar cada uno desde su propio 300 y superponerse mal en vez de apilarse.
let sharedTopZIndex = BASE_Z_INDEX;
const stack: symbol[] = [];

// Reemplaza los z-index fijos ad-hoc que ya usaban PanelBox (100) y FuzzyFinderModal
// (200) — cualquier modal nuevo que use este composable se apila automáticamente por
// encima de todo lo anterior, y solo el que está más arriba (`isTopmost()`) reacciona
// a Escape, para no cerrar en cascada varios modales apilados con una sola tecla.
export function useModalStack() {
  const zIndex = ref(sharedTopZIndex);
  const id = Symbol("modal-layer");

  onMounted(() => {
    sharedTopZIndex += 10;
    zIndex.value = sharedTopZIndex;
    stack.push(id);
  });

  onBeforeUnmount(() => {
    const index = stack.indexOf(id);
    if (index !== -1) stack.splice(index, 1);
  });

  function isTopmost(): boolean {
    return stack.length > 0 && stack[stack.length - 1] === id;
  }

  return { zIndex, isTopmost };
}
