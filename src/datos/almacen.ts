// Todo lo del usuario (listas, sitios, tiendas, precios y elecciones) vive
// en el teléfono o el navegador, en localStorage, igual que en las otras
// apps. El servidor solo busca; no guarda nada.
//
// Los datos se cargan una vez y se guardan enteros en cada cambio. Si el
// formato cambia, se sube VERSION_DATOS y se agrega una migración.

import type { Eleccion, Lista, Oferta, Sitio, Tienda } from '../../compartido/tipos.ts';

const CLAVE = 'mercam:datos';
const VERSION_DATOS = 1;

export interface Datos {
  version: number;
  listas: Lista[];
  sitios: Sitio[];
  tiendas: Tienda[];
  /** Últimos precios conocidos: los online se reemplazan en cada búsqueda. */
  ofertas: Oferta[];
  elecciones: Eleccion[];
}

function vacios(): Datos {
  return { version: VERSION_DATOS, listas: [], sitios: [], tiendas: [], ofertas: [], elecciones: [] };
}

let datos: Datos = cargar();

function cargar(): Datos {
  try {
    const texto = localStorage.getItem(CLAVE);
    if (!texto) return vacios();
    const leidos = JSON.parse(texto) as Partial<Datos>;
    return { ...vacios(), ...leidos, version: VERSION_DATOS };
  } catch {
    return vacios();
  }
}

export function leer(): Readonly<Datos> {
  return datos;
}

/** Cambia los datos y los guarda: `cambiar((d) => { d.listas.push(...) })`. */
export function cambiar(cambio: (datos: Datos) => void): void {
  cambio(datos);
  localStorage.setItem(CLAVE, JSON.stringify(datos));
}

export function nuevoId(): string {
  return crypto.randomUUID();
}

/** Reemplaza los precios online de esas tiendas y productos por los recién buscados. */
export function guardarOfertasOnline(tiendaIds: string[], productoIds: string[], nuevas: Oferta[]): void {
  const tiendas = new Set(tiendaIds);
  const productos = new Set(productoIds);
  cambiar((d) => {
    d.ofertas = d.ofertas.filter(
      (o) => o.origen !== 'online' || !tiendas.has(o.tiendaId) || !productos.has(o.productoId),
    );
    d.ofertas.push(...nuevas);
  });
}
