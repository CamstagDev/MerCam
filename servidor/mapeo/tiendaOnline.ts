// ¿Esta tienda vende online, y con qué buscador se la consulta?
//
// 1. Si su cadena está en CADENAS_CONOCIDAS, se usa eso.
// 2. Si OpenStreetMap trae su sitio web, se le pregunta a cada buscador
//    (servidor/buscadores) si sabe leer ese sitio.
// 3. Si nada funciona, queda como que no vende online (null).

import type { TiendaOnline } from '../../compartido/tipos.ts';
import { BUSCADORES } from '../buscadores/registro.ts';
import type { TiendaMapeada } from './supermercados.ts';

/**
 * Cadenas cuyo sitio y buscador ya conocemos, por nombre normalizado.
 * Se completa a medida que se agregan cadenas de la zona.
 */
export const CADENAS_CONOCIDAS: Record<string, TiendaOnline> = {};

function clave(nombre: string): string {
  return nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export async function detectarTiendaOnline(tienda: TiendaMapeada): Promise<TiendaOnline | null> {
  for (const nombre of [tienda.cadena, tienda.nombre]) {
    const conocida = nombre ? CADENAS_CONOCIDAS[clave(nombre)] : undefined;
    if (conocida) return conocida;
  }
  if (!tienda.sitioWeb) return null;
  let origen: string;
  try {
    origen = new URL(tienda.sitioWeb).origin;
  } catch {
    return null;
  }
  for (const buscador of BUSCADORES) {
    try {
      if (await buscador.reconoce(origen)) return { url: origen, adaptador: buscador.id };
    } catch {
      // Ese buscador no pudo con el sitio; se prueba el siguiente.
    }
  }
  return null;
}
