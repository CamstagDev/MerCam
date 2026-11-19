// Historial de precios: cada precio que MerCam ve (búsquedas online,
// precios cargados a mano, compras registradas en la despensa) se anota
// por tienda y producto, un punto por día. Con eso se sabe si el precio de
// hoy es una oferta de verdad o el de siempre.
//
// Lógica pura (sin pantalla ni localStorage) para poder probarla
// (tests/historial.test.ts).

import type { PuntoPrecio, SeriePrecio } from '../../compartido/tipos.ts';
import { normalizar } from './comparar.ts';

/** Puntos que se guardan por serie (los más viejos se descartan). */
export const PUNTOS_POR_SERIE = 90;
/** Series que se guardan en total (las que no se ven hace más tiempo se descartan). */
export const SERIES_MAXIMAS = 1500;
/** Por debajo de este porcentaje del precio usual, es oferta. */
export const UMBRAL_OFERTA = 0.93;
/** Por encima de este porcentaje del precio usual, está caro. */
export const UMBRAL_CARO = 1.07;

export function dia(fecha: Date | string = new Date()): string {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
  const dosDigitos = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}-${dosDigitos(d.getDate())}`;
}

export function claveSerie(tienda: string, titulo: string): string {
  return `${normalizar(tienda)}|${normalizar(titulo)}`;
}

export interface PrecioVisto {
  /** Nombre del producto buscado (el de la lista o el artículo). */
  producto: string;
  titulo: string;
  tienda: string;
  tiendaId?: string;
  precio: number;
  precioLista?: number;
  moneda: string;
  origen: SeriePrecio['origen'];
  fecha?: Date | string;
}

/** Anota un precio. Si ya había uno ese día en esa tienda, lo reemplaza. */
export function anotarPrecio(historial: Record<string, SeriePrecio>, visto: PrecioVisto): void {
  if (!(visto.precio > 0)) return;
  const clave = claveSerie(visto.tiendaId ?? visto.tienda, visto.titulo);
  const serie: SeriePrecio = historial[clave] ?? {
    clave,
    producto: normalizar(visto.producto),
    titulo: visto.titulo,
    tienda: visto.tienda,
    tiendaId: visto.tiendaId,
    origen: visto.origen,
    moneda: visto.moneda,
    puntos: [],
  };
  serie.tienda = visto.tienda;
  const punto: PuntoPrecio = { dia: dia(visto.fecha), precio: visto.precio };
  if (visto.precioLista && visto.precioLista > visto.precio) punto.precioLista = visto.precioLista;
  const mismoDia = serie.puntos.findIndex((p) => p.dia === punto.dia);
  if (mismoDia >= 0) serie.puntos[mismoDia] = punto;
  else serie.puntos.push(punto);
  serie.puntos.sort((a, b) => a.dia.localeCompare(b.dia));
  if (serie.puntos.length > PUNTOS_POR_SERIE) serie.puntos = serie.puntos.slice(-PUNTOS_POR_SERIE);
  historial[clave] = serie;
}

/** Deja solo las `maximo` series vistas más recientemente. */
export function podarHistorial(historial: Record<string, SeriePrecio>, maximo = SERIES_MAXIMAS): Record<string, SeriePrecio> {
  const series = Object.values(historial);
  if (series.length <= maximo) return historial;
  const ultimo = (s: SeriePrecio) => s.puntos.at(-1)?.dia ?? '';
  series.sort((a, b) => ultimo(b).localeCompare(ultimo(a)));
  return Object.fromEntries(series.slice(0, maximo).map((s) => [s.clave, s]));
}

export type Veredicto = 'nuevo' | 'minimo' | 'oferta' | 'normal' | 'caro';

export interface Analisis {
  veredicto: Veredicto;
  /** Promedio de los días anteriores (sin contar hoy). */
  promedio?: number;
  minimo?: number;
  maximo?: number;
  /** Cuántos días anteriores hay para comparar. */
  dias: number;
  /** precio / promedio - 1 (negativo: más barato que lo usual). */
  variacion?: number;
}

/**
 * Compara un precio con lo que se vio antes en esa misma serie (sin contar
 * el día de hoy, que es el que se está evaluando):
 *
 *   nuevo   no hay días anteriores para comparar
 *   minimo  el más bajo que se ha visto (y más bajo que el promedio)
 *   oferta  al menos 7 % por debajo del promedio
 *   caro    al menos 7 % por encima del promedio
 *   normal  lo de siempre
 */
export function analizarPrecio(puntos: PuntoPrecio[], precio: number, hoy = dia()): Analisis {
  const anteriores = puntos.filter((p) => p.dia < hoy).map((p) => p.precio);
  if (!anteriores.length) return { veredicto: 'nuevo', dias: 0 };
  const promedio = anteriores.reduce((a, b) => a + b, 0) / anteriores.length;
  const minimo = Math.min(...anteriores);
  const maximo = Math.max(...anteriores);
  const variacion = precio / promedio - 1;
  let veredicto: Veredicto = 'normal';
  if (precio < minimo && precio < promedio) veredicto = 'minimo';
  else if (precio <= promedio * UMBRAL_OFERTA) veredicto = 'oferta';
  else if (precio >= promedio * UMBRAL_CARO) veredicto = 'caro';
  return { veredicto, promedio, minimo, maximo, dias: anteriores.length, variacion };
}

/** Análisis de una oferta contra su propia serie (misma tienda y título). */
export function analizarOferta(
  historial: Record<string, SeriePrecio>,
  tienda: string,
  titulo: string,
  precio: number,
  hoy = dia(),
): Analisis {
  return analizarPrecio(historial[claveSerie(tienda, titulo)]?.puntos ?? [], precio, hoy);
}

/** Todas las series de un producto (por nombre), de cualquier tienda. */
export function seriesDelProducto(historial: Record<string, SeriePrecio>, ...nombres: string[]): SeriePrecio[] {
  const buscados = new Set(nombres.filter(Boolean).map(normalizar));
  return Object.values(historial)
    .filter((s) => buscados.has(s.producto) || buscados.has(normalizar(s.titulo)))
    .sort((a, b) => (b.puntos.at(-1)?.dia ?? '').localeCompare(a.puntos.at(-1)?.dia ?? ''));
}

export const TEXTO_VEREDICTO: Record<Veredicto, string> = {
  nuevo: 'Primera vez visto',
  minimo: 'El más bajo visto',
  oferta: 'En oferta',
  normal: 'Precio usual',
  caro: 'Más caro que lo usual',
};
