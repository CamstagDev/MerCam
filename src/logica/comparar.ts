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

/** Palabras que no ayudan a reconocer un producto. */
const PALABRAS_VACIAS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'con', 'sin', 'y', 'en', 'x', 'por', 'para']);

function palabras(texto: string): string[] {
  return normalizar(texto)
    .replace(/[^a-z0-9.,]+/g, ' ')
    .split(' ')
    .filter((p) => p && !PALABRAS_VACIAS.has(p));
}

/**
 * Un precio manual sirve para un producto de la lista si su título trae
 * todas las palabras del producto: "Leche entera de Toro 1 L" sirve para
 * "Leche entera" y para "leche", pero no para "Leche deslactosada".
 */
export function coincideManual(titulo: string, nombreProducto: string): boolean {
  const buscadas = palabras(nombreProducto);
  if (!buscadas.length) return false;
  const delTitulo = new Set(palabras(titulo));
  return buscadas.every((p) => delTitulo.has(p));
}

export function esDelProducto(oferta: Oferta, producto: Producto): boolean {
  if (oferta.productoId === producto.id || oferta.productoId === claveManual(producto.nombre)) return true;
  return oferta.origen === 'manual' && oferta.productoId.startsWith('manual:') && coincideManual(oferta.titulo, producto.nombre);
}

/** La misma palabra, aunque una esté en plural ("huevo" y "huevos"). */
function mismaPalabra(a: string, b: string): boolean {
  return a === b || a === `${b}s` || b === `${a}s` || a === `${b}es` || b === `${a}es`;
}

/**
 * Qué tanto se parece una oferta al producto buscado (de 0 a 3): 2 puntos
 * si el título empieza por la primera palabra del producto ("Leche entera
 * Alpina" para "leche", no "Chocolatina de leche") y 1 si trae todas sus
 * palabras ("Leche entera" y no "Leche deslactosada" para "leche entera").
 */
export function exactitud(titulo: string, nombreProducto: string): number {
  const buscadas = palabras(nombreProducto);
  const delTitulo = palabras(titulo);
  if (!buscadas.length || !delTitulo.length) return 0;
  const empieza = mismaPalabra(delTitulo[0]!, buscadas[0]!) ? 2 : 0;
  const todas = buscadas.every((b) => delTitulo.some((t) => mismaPalabra(t, b))) ? 1 : 0;
  return empieza + todas;
}

/**
 * Ofertas de un producto en el orden en que se muestran: si el producto
 * tiene marca, primero las de esa marca y después el resto; dentro de cada
 * grupo, primero las que más se parecen a lo buscado (ver exactitud) y,
 * entre las igual de parecidas, de la más barata a la más cara.
 */
export function ordenarOfertas(producto: Producto, ofertas: Oferta[]): Oferta[] {
  const propias = ofertas.filter((o) => esDelProducto(o, producto));
  const puntos = new Map(propias.map((o) => [o, exactitud(o.titulo, producto.nombre)]));
  const orden = (a: Oferta, b: Oferta) => puntos.get(b)! - puntos.get(a)! || a.precio - b.precio;
  if (!producto.marca) return [...propias].sort(orden);
  const marca = producto.marca;
  const deLaMarca = propias.filter((o) => esDeLaMarca(o, marca)).sort(orden);
  const otras = propias.filter((o) => !esDeLaMarca(o, marca)).sort(orden);
  return [...deLaMarca, ...otras];
}

export function ofertasVisibles<T>(ordenadas: T[], verTodas: boolean): T[] {
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

export interface OfertaAgrupada {
  /** La oferta que se muestra (y se elige): la de la primera tienda. */
  oferta: Oferta;
  /** Todas las tiendas que la tienen igual. */
  tiendas: Tienda[];
}

/**
 * De qué "tienda" es un precio a efectos de repetidos: las sedes de una
 * misma cadena (Carulla y Carulla Pance) suelen compartir la tienda online
 * y salen con el mismo producto al mismo precio.
 */
function grupoDeTienda(tienda: Tienda | undefined, tiendaId: string): string {
  if (tienda?.cadena) return `cadena:${normalizar(tienda.cadena)}`;
  if (tienda?.online) return `online:${tienda.online.url}`;
  return `tienda:${tiendaId}`;
}

/**
 * Junta las ofertas repetidas: mismo producto (título), mismo precio y
 * misma cadena o tienda online. Se conserva el orden de entrada.
 */
export function agruparRepetidas(ofertas: Oferta[], tiendas: Tienda[]): OfertaAgrupada[] {
  const grupos = new Map<string, OfertaAgrupada>();
  for (const oferta of ofertas) {
    const tienda = tiendas.find((t) => t.id === oferta.tiendaId);
    const clave = `${grupoDeTienda(tienda, oferta.tiendaId)}|${normalizar(oferta.titulo)}|${oferta.precio}`;
    const grupo = grupos.get(clave);
    if (!grupo) grupos.set(clave, { oferta, tiendas: tienda ? [tienda] : [] });
    else if (tienda && !grupo.tiendas.includes(tienda)) grupo.tiendas.push(tienda);
  }
  return [...grupos.values()];
}

/** El mismo producto en varios sitios: se muestra el más barato y los demás quedan plegados. */
export interface GrupoIgual {
  clave: string;
  /** De la más barata a la más cara (en el orden de entrada). */
  opciones: OfertaAgrupada[];
}

/**
 * Clave de "producto igual": el título sin tildes, signos ni mayúsculas y
 * con las palabras ordenadas, para que "Leche Alpina 1100 ml" y
 * "LECHE ALPINA (1100 ML)" cuenten como el mismo.
 */
export function claveDeProducto(titulo: string): string {
  return normalizar(titulo)
    .replace(/[^a-z0-9.,]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .sort()
    .join(' ');
}

/**
 * Agrupa las ofertas del mismo producto en distintos sitios. Los grupos
 * salen en el orden de su primera oferta (la más barata, o la de la marca
 * pedida), y dentro de cada grupo se respeta el orden de entrada.
 */
export function agruparIguales(ofertas: OfertaAgrupada[]): GrupoIgual[] {
  const grupos = new Map<string, GrupoIgual>();
  for (const opcion of ofertas) {
    const clave = claveDeProducto(opcion.oferta.titulo);
    const grupo = grupos.get(clave);
    if (grupo) grupo.opciones.push(opcion);
    else grupos.set(clave, { clave, opciones: [opcion] });
  }
  return [...grupos.values()];
}
