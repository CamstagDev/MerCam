// Todos los buscadores disponibles. El orden importa al detectar la
// plataforma de una tienda: se prueba de arriba hacia abajo.

import type { Buscador } from './buscador.ts';
import { buscadorMercamio } from './mercamio.ts';
import { buscadorVtex } from './vtex.ts';

export const BUSCADORES: Buscador[] = [buscadorMercamio, buscadorVtex];

export function buscadorPorId(id: string): Buscador | undefined {
  return BUSCADORES.find((b) => b.id === id);
}
