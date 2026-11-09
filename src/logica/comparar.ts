// Ordena y agrupa ofertas. Es lógica pura (sin pantalla ni red) para
// poder probarla (tests/comparar.test.ts).

import type { Eleccion, Oferta, Producto, Tienda } from '../../compartido/tipos.ts';

/** Cuántas ofertas se ven por producto antes de "Ver más". */
export const OFERTAS_VISIBLES = 3;

export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export function esDeLaMarca(oferta: Oferta, marca: string): boolean {
  const buscada = normalizar(marca);
  if (!buscada) return false;
  if (oferta.marca && normalizar(oferta.marca) === buscada) return true;
  return normalizar(oferta.titulo).includes(buscada);
}

/**
 * Los precios manuales (de tiendas sin web) no son de una lista en
 * particular: se guardan por nombre de producto, así sirven para todas.
 */
export function claveManual(nombreProducto: string): string {
  return `manual:${normalizar(nombreProducto)}`;
}

export function esDelProducto(oferta: Oferta, producto: Producto): boolean {
  return oferta.productoId === producto.id || oferta.productoId === claveManual(producto.nombre);
}

/**
 * Ofertas de un producto en el orden en que se muestran: si el producto
 * tiene marca, primero las de esa marca y después el resto; dentro de cada
 * grupo, de la más barata a la más cara.
 */
export function ordenarOfertas(producto: Producto, ofertas: Oferta[]): Oferta[] {
  const propias = ofertas.filter((o) => esDelProducto(o, producto));
  const porPrecio = (a: Oferta, b: Oferta) => a.precio - b.precio;
  if (!producto.marca) return [...propias].sort(porPrecio);
  const marca = producto.marca;
  const deLaMarca = propias.filter((o) => esDeLaMarca(o, marca)).sort(porPrecio);
  const otras = propias.filter((o) => !esDeLaMarca(o, marca)).sort(porPrecio);
  return [...deLaMarca, ...otras];
}

export function ofertasVisibles(ordenadas: Oferta[], verTodas: boolean): Oferta[] {
  return verTodas ? ordenadas : ordenadas.slice(0, OFERTAS_VISIBLES);
}

export interface GrupoMinilista {
  tienda: Tienda;
  elecciones: Eleccion[];
  total: number;
}

/**
 * La "minilista": las elecciones agrupadas por tienda, con el total de
 * cada una (precio × cantidad). Las tiendas más caras primero, para que
 * se vea dónde va la mayor parte de la compra.
 */
export function armarMinilista(
  elecciones: Eleccion[],
  productos: Producto[],
  tiendas: Tienda[],
): GrupoMinilista[] {
  const cantidad = new Map(productos.map((p) => [p.id, p.cantidad]));
  const grupos = new Map<string, GrupoMinilista>();
  for (const eleccion of elecciones) {
    const tienda = tiendas.find((t) => t.id === eleccion.oferta.tiendaId);
    if (!tienda) continue;
    let grupo = grupos.get(tienda.id);
    if (!grupo) {
      grupo = { tienda, elecciones: [], total: 0 };
      grupos.set(tienda.id, grupo);
    }
    grupo.elecciones.push(eleccion);
    grupo.total += eleccion.oferta.precio * (cantidad.get(eleccion.productoId) ?? 1);
  }
  return [...grupos.values()].sort((a, b) => b.total - a.total);
}
