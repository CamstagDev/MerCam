// ¿Esta tienda vende online, y con qué buscador se la consulta?
//
// 1. Si es de una cadena conocida (servidor/cadenas/*.json), se usa lo
//    que dice su archivo (también si dice que no vende online).
// 2. Si OpenStreetMap trae su sitio web, se le pregunta a cada buscador
//    (servidor/buscadores) si sabe leer ese sitio.
// 3. Si nada funciona, queda como que no vende online (null).

import type { TiendaOnline } from '../../compartido/tipos.ts';
import { BUSCADORES } from '../buscadores/registro.ts';
import { cadenaDeTienda } from '../cadenas/cadenas.ts';
import type { TiendaMapeada } from './supermercados.ts';

export async function detectarTiendaOnline(tienda: TiendaMapeada): Promise<TiendaOnline | null> {
  const cadena = cadenaDeTienda(tienda.cadena, tienda.nombre);
  if (cadena) return cadena.tiendaOnline;
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
