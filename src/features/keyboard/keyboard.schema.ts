import { z } from "zod";

// Schema rediseñado: mismo alcance funcional que los layouts originales de eDEX-UI
// (dead-keys, modificadores, secuencias de control "~~~CTRLSEQ<n>~~~"), pero tipado y
// en camelCase, sin depender de compatibilidad binaria con los JSON de la comunidad
// eDEX-UI. "name"/"cmd" están siempre presentes en los 19 layouts portados; el resto
// son variantes por modificador y son opcionales porque no toda tecla tiene las 6
// combinaciones.
export const keyDefSchema = z.object({
  name: z.string(),
  cmd: z.string(),
  shiftName: z.string().optional(),
  shiftCmd: z.string().optional(),
  altName: z.string().optional(),
  altCmd: z.string().optional(),
  fnName: z.string().optional(),
  fnCmd: z.string().optional(),
  altShiftName: z.string().optional(),
  altShiftCmd: z.string().optional(),
  ctrlCmd: z.string().optional(),
  capsLckCmd: z.string().optional(),
});

// Las claves de nivel superior son ids de fila (row_numbers, row_1, row_2, row_3,
// row_space) — el ORDEN de esas claves en el JSON determina el orden de renderizado
// de arriba hacia abajo, igual que Object.keys() en el original. z.record() no
// garantiza preservar el orden de inserción por spec, pero en la práctica V8 (el motor
// detrás de WebView2) sí lo hace para claves string no numéricas, que es lo único que
// usan estos layouts.
export const keyboardLayoutSchema = z.record(z.string(), z.array(keyDefSchema));

export type KeyDef = z.infer<typeof keyDefSchema>;
export type KeyboardLayout = z.infer<typeof keyboardLayoutSchema>;
