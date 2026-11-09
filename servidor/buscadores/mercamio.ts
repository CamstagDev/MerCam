// Mercamio (Cali, también Bogotá y Chía). Su página (mercamio.com) usa un
// servicio propio que devuelve cada producto con su precio en cada sede,
// así que cada sede es una tienda distinta (TiendaOnline.sede).

import type { Coordenadas } from '../../compartido/tipos.ts';
import type { TiendaMapeada } from '../mapeo/supermercados.ts';
import { pedirJson } from '../red.ts';
import type { Buscador, ResultadoBuscador } from './buscador.ts';

const SERVICIO = 'https://wacoecommerce-js4zy.ondigitalocean.app/api/v1';
const PAGINA = 'https://mercamio.com';
const CABECERAS = { 'at-business': 'mercamio' };
const MAXIMO = 30;

export interface SedeMercamio {
  id: string;
  inactive?: boolean;
  name?: string;
  address?: string;
  city?: string;
  /** Ojo: Mercamio guarda [lat, lon], no el orden de GeoJSON. */
  geopoint?: { coordinates?: [number, number] };
}

export interface ProductoMercamio {
  id: string;
  title: string;
  brand?: string;
  stock_branch_offices?: { id: string; price?: number; price_neto?: number; discount?: number; stock?: number }[];
}

/** Distancia en metros entre dos puntos (fórmula del haversine). */
export function distanciaM(a: Coordenadas, b: Coordenadas): number {
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

export function leerSedes(sedes: SedeMercamio[], centro: Coordenadas, radioM: number): TiendaMapeada[] {
  const cerca: TiendaMapeada[] = [];
  for (const sede of sedes) {
    const [lat, lon] = sede.geopoint?.coordinates ?? [];
    if (sede.inactive || lat === undefined || lon === undefined) continue;
    if (distanciaM(centro, { lat, lon }) > radioM) continue;
    cerca.push({
      nombre: `Mercamio ${sede.name ?? ''}`.trim(),
      cadena: 'Mercamio',
      direccion: sede.address,
      coordenadas: { lat, lon },
      origen: 'mapeada',
      osmId: `mercamio/${sede.id}`,
      online: { url: PAGINA, adaptador: 'mercamio', sede: sede.id },
    });
  }
  return cerca;
}

/** El precio de cada producto en una sede; los que no están o no tienen stock ahí se omiten. */
export function leerProductosMercamio(productos: ProductoMercamio[], sede: string): ResultadoBuscador[] {
  const resultados: ResultadoBuscador[] = [];
  for (const producto of productos) {
    const enSede = producto.stock_branch_offices?.find((s) => s.id === sede);
    if (!enSede || !enSede.stock) continue;
    const lista = enSede.price ?? 0;
    const neto = enSede.price_neto ?? 0;
    const precio = neto > 0 && (lista === 0 || neto < lista) ? neto : lista;
    if (precio <= 0) continue;
    resultados.push({
      titulo: producto.title,
      marca: producto.brand,
      precio,
      precioLista: lista > precio ? lista : undefined,
      url: `${PAGINA}/product/${encodeURIComponent(producto.id)}`,
    });
  }
  return resultados;
}

export const buscadorMercamio: Buscador = {
  id: 'mercamio',
  patronCadena: /\bmercamio\b/,

  async reconoce(origen) {
    return /(^|\.)mercamio\.com$/.test(new URL(origen).hostname);
  },

  async sedesCerca(centro, radioM) {
    const { data } = await pedirJson<{ data: SedeMercamio[] }>(`${SERVICIO}/offices`, { headers: CABECERAS });
    return leerSedes(data, centro, radioM);
  },

  async buscar({ sede }, texto) {
    if (!sede) throw new Error('Falta la sede de Mercamio; vuelve a mapear el sitio');
    const url = new URL(`${SERVICIO}/search/products`);
    url.searchParams.set('query', texto);
    url.searchParams.set('page', '0');
    url.searchParams.set('limit', String(MAXIMO));
    const { data } = await pedirJson<{ data: { products: ProductoMercamio[] } }>(url.toString(), { headers: CABECERAS });
    return leerProductosMercamio(data.products ?? [], sede);
  },
};
