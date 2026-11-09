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
 * Cadenas cuyo sitio y buscador ya conocemos. El patrón se busca como
 * palabra en el nombre o la marca normalizados ("Éxito Express La 14"
 * -> "exito express la 14"). Probadas en Cali (Colombia) el 2026-11-09.
 * Sin tienda online con precios: Súper Inter, Ara, Surtimax, Makro;
 * Mercamio tiene una app propia (pendiente).
 */
export const CADENAS_CONOCIDAS: { patron: RegExp; online: TiendaOnline }[] = [
  { patron: /\bexito\b/, online: { url: 'https://www.exito.com', adaptador: 'vtex' } },
  { patron: /\bcarulla\b/, online: { url: 'https://www.carulla.com', adaptador: 'vtex' } },
  { patron: /\bolimpica\b/, online: { url: 'https://www.olimpica.com', adaptador: 'vtex' } },
  // Jumbo y Metro (Cencosud) comparten tienda online.
  { patron: /\b(jumbo|metro)\b/, online: { url: 'https://www.jumbocolombia.com', adaptador: 'vtex' } },
  { patron: /\b(tiendas )?d1\b/, online: { url: 'https://www.d1.com.co', adaptador: 'vtex' } },
];

export function normalizarNombre(nombre: string): string {
  return nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function cadenaConocida(...nombres: (string | undefined)[]): TiendaOnline | undefined {
  for (const nombre of nombres) {
    if (!nombre) continue;
    const limpio = normalizarNombre(nombre);
    const cadena = CADENAS_CONOCIDAS.find((c) => c.patron.test(limpio));
    if (cadena) return cadena.online;
  }
  return undefined;
}

export async function detectarTiendaOnline(tienda: TiendaMapeada): Promise<TiendaOnline | null> {
  const conocida = cadenaConocida(tienda.cadena, tienda.nombre);
  if (conocida) return conocida;
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
