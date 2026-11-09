// Tiendas hechas con VTEX, la plataforma de muchos supermercados de
// Latinoamérica. Tienen un buscador público de catálogo que responde JSON,
// así que no hace falta abrir un navegador para leer los precios.

import { pedirJson } from '../red.ts';
import type { Buscador, ResultadoBuscador } from './buscador.ts';

const RUTA = '/api/catalog_system/pub/products/search';
const MAXIMO = 20;

export interface ProductoVtex {
  productName: string;
  brand?: string;
  link?: string;
  items?: {
    sellers?: {
      commertialOffer?: { Price?: number; ListPrice?: number; IsAvailable?: boolean };
    }[];
  }[];
}

/** El precio más bajo disponible de cada producto; los sin stock se omiten. */
export function leerProductosVtex(productos: ProductoVtex[]): ResultadoBuscador[] {
  const resultados: ResultadoBuscador[] = [];
  for (const producto of productos) {
    let mejor: { Price: number; ListPrice?: number } | undefined;
    for (const item of producto.items ?? []) {
      for (const vendedor of item.sellers ?? []) {
        const oferta = vendedor.commertialOffer;
        if (!oferta?.IsAvailable || !oferta.Price) continue;
        if (!mejor || oferta.Price < mejor.Price) mejor = { Price: oferta.Price, ListPrice: oferta.ListPrice };
      }
    }
    if (!mejor) continue;
    resultados.push({
      titulo: producto.productName,
      marca: producto.brand,
      precio: mejor.Price,
      precioLista: mejor.ListPrice && mejor.ListPrice > mejor.Price ? mejor.ListPrice : undefined,
      url: producto.link,
    });
  }
  return resultados;
}

export const buscadorVtex: Buscador = {
  id: 'vtex',

  async reconoce(origen) {
    const respuesta = await pedirJson<unknown>(`${origen}${RUTA}?ft=leche&_from=0&_to=0`, {}, 8000);
    return Array.isArray(respuesta);
  },

  async buscar(origen, texto) {
    const url = `${origen}${RUTA}?ft=${encodeURIComponent(texto)}&_from=0&_to=${MAXIMO - 1}`;
    return leerProductosVtex(await pedirJson<ProductoVtex[]>(url));
  },
};
