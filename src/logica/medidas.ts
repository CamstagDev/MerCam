// Unidades de medida y contenido de los productos: con ellas se compara
// el precio por litro o por kilo de ofertas de tamaños distintos (una
// leche de 1100 ml contra una de 1000 ml).
//
// Lógica pura para poder probarla (tests/medidas.test.ts).

import type { ItemCatalogo } from '../../compartido/tipos.ts';
import { normalizar } from './comparar.ts';

export type Base = NonNullable<ItemCatalogo['base']>;

export interface Medida {
  base: Base;
  /** Cantidad en la unidad base (ml, g o unidades). */
  cantidad: number;
}

/** Cómo se reconocen las unidades por su nombre (en catálogos y títulos). */
const UNIDADES: { palabras: string[]; base: Base; factor: number }[] = [
  { palabras: ['ml', 'cc', 'mililitro', 'mililitros'], base: 'ml', factor: 1 },
  { palabras: ['l', 'lt', 'lts', 'litro', 'litros'], base: 'ml', factor: 1000 },
  { palabras: ['g', 'gr', 'grs', 'gramo', 'gramos'], base: 'g', factor: 1 },
  { palabras: ['kg', 'kgs', 'kilo', 'kilos', 'kilogramo', 'kilogramos'], base: 'g', factor: 1000 },
  { palabras: ['lb', 'libra', 'libras'], base: 'g', factor: 500 },
  { palabras: ['und', 'un', 'unidad', 'unidades', 'u'], base: 'und', factor: 1 },
  { palabras: ['docena', 'docenas'], base: 'und', factor: 12 },
];

/** La base y el factor de una unidad por su nombre ("Litros" -> ml × 1000). */
export function reconocerUnidad(nombre: string): { base: Base; factor: number } | undefined {
  const limpio = normalizar(nombre).replace(/\.$/, '');
  const encontrada = UNIDADES.find((u) => u.palabras.includes(limpio));
  return encontrada && { base: encontrada.base, factor: encontrada.factor };
}

/** La base y el factor de una unidad del catálogo (los suyos o, si no tiene, por su nombre). */
export function medidaDeUnidad(unidad: ItemCatalogo | undefined): { base: Base; factor: number } | undefined {
  if (!unidad) return undefined;
  if (unidad.base && unidad.factor) return { base: unidad.base, factor: unidad.factor };
  return reconocerUnidad(unidad.nombre);
}

/** Contenido de un producto en su unidad base, si tiene contenido y unidad reconocible. */
export function medidaDeContenido(contenido: number | undefined, unidad: ItemCatalogo | undefined): Medida | undefined {
  const m = medidaDeUnidad(unidad);
  return m && contenido && contenido > 0 ? { base: m.base, cantidad: contenido * m.factor } : undefined;
}

const PATRON = /(\d+(?:[.,]\d+)?)\s*(ml|cc|mililitros?|lts?|litros?|l|kgs?|kilos?|kilogramos?|grs?|gramos?|g|lb|libras?|und|unidades?)(?![a-z])/gi;
/** "x 6", "x6 und", "pack 4": varias unidades del mismo tamaño. */
const PACK = /(?:^|\s)(?:x|pack)\s*(\d{1,2})(?:\s*(?:und|unidades?|u))?(?=\s|\)|$)/;

/**
 * El tamaño que dice el título de una oferta ("Leche entera (1100 ml)",
 * "Arroz Diana 500 g x 6"). Si hay varios, se toma el último; si dice
 * "x 6", se multiplica. Sin tamaño reconocible, undefined.
 */
export function medidaDeTitulo(titulo: string): Medida | undefined {
  const texto = normalizar(titulo);
  let ultima: Medida | undefined;
  for (const [, numero = '', unidad = ''] of texto.matchAll(PATRON)) {
    const u = reconocerUnidad(unidad);
    const valor = Number(numero.replace(',', '.'));
    if (u && valor > 0 && u.base !== 'und') ultima = { base: u.base, cantidad: valor * u.factor };
  }
  if (!ultima) return undefined;
  const pack = Number(PACK.exec(texto)?.[1] ?? 1);
  return { base: ultima.base, cantidad: ultima.cantidad * (pack > 1 ? pack : 1) };
}

/** Precio por 1 L, 1 kg o 1 unidad. */
export function precioDeReferencia(precio: number, medida: Medida): number {
  return (precio / medida.cantidad) * (medida.base === 'und' ? 1 : 1000);
}

export const TEXTO_REFERENCIA: Record<Base, string> = { ml: 'L', g: 'kg', und: 'und' };

/** Texto corto del contenido: "1000 ml", "1 L". */
export function textoContenido(contenido: number | undefined, unidad: ItemCatalogo | undefined): string {
  if (!contenido || !unidad) return '';
  return `${contenido.toLocaleString('es-CO', { maximumFractionDigits: 3 })} ${unidad.nombre}`;
}
