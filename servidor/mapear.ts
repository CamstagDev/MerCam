// Supermercados cerca de una dirección o unas coordenadas, y si venden
// online. Lo usan el servidor (POST /api/mapear) y la app de Android, que
// lo corre ella misma (src/datos/motorLocal.ts).

import type { PedidoMapeo, RespuestaMapeo } from '../compartido/tipos.ts';
import { BUSCADORES } from './buscadores/registro.ts';
import { cadenaDeTienda } from './cadenas/cadenas.ts';
import { geocodificar } from './mapeo/geocodificar.ts';
import { buscarSupermercados } from './mapeo/supermercados.ts';
import { detectarTiendaOnline } from './mapeo/tiendaOnline.ts';

/** Un pedido mal armado (falta la dirección): el servidor responde 400. */
export class PedidoInvalido extends Error {}

export async function mapearZona({ direccion, radioM, coordenadas: dadas }: Partial<PedidoMapeo>): Promise<RespuestaMapeo> {
  const sonValidas = typeof dadas?.lat === 'number' && typeof dadas.lon === 'number' && Math.abs(dadas.lat) <= 90 && Math.abs(dadas.lon) <= 180;
  if (!sonValidas && (!direccion || typeof direccion !== 'string')) throw new PedidoInvalido('Falta la dirección');

  const { coordenadas, direccionEncontrada } = sonValidas
    ? { coordenadas: { lat: dadas!.lat, lon: dadas!.lon }, direccionEncontrada: direccion ?? '' }
    : await geocodificar(direccion!);
  const radio = Math.min(Number(radioM) || 2000, 10000);
  let encontradas = await buscarSupermercados(coordenadas, radio);
  const tiendas: RespuestaMapeo['tiendas'] = [];

  // Cadenas con su propia lista de sedes (Mercamio): se usan sus sedes
  // en vez de las que trae OpenStreetMap.
  for (const buscador of BUSCADORES) {
    if (!buscador.sedesCerca || !buscador.cadenaId) continue;
    try {
      const sedes = await buscador.sedesCerca(coordenadas, radio);
      const cadenaId = buscador.cadenaId;
      encontradas = encontradas.filter((t) => cadenaDeTienda(t.cadena, t.nombre)?.id !== cadenaId);
      tiendas.push(...sedes);
    } catch (error) {
      console.error(`No se pudieron leer las sedes de ${buscador.id}:`, error);
    }
  }

  tiendas.push(
    ...(await Promise.all(
      encontradas.map(async ({ sitioWeb, ...tienda }) => ({ ...tienda, online: await detectarTiendaOnline({ ...tienda, sitioWeb }) })),
    )),
  );
  return { coordenadas, direccionEncontrada, tiendas };
}
