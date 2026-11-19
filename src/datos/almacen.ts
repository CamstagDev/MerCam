// Todo lo del usuario (listas, sitios, tiendas, precios, elecciones, la
// despensa, los planes de comidas y el historial de precios) vive en el
// teléfono o el navegador, en localStorage, igual que en las otras apps.
// El servidor solo busca; no guarda nada.
//
// Los datos se cargan una vez y se guardan enteros en cada cambio. Si el
// formato cambia, se sube VERSION_DATOS y se agrega una migración.

import type {
  Articulo,
  Comida,
  Despensa,
  Eleccion,
  ItemCatalogo,
  Lista,
  Mercado,
  Movimiento,
  Oferta,
  Plan,
  SeriePrecio,
  Sitio,
  Tienda,
} from '../../compartido/tipos.ts';
import { podarHistorial } from '../logica/historial.ts';

const CLAVE = 'mercam:datos';
/** 1: listas y sitios. 2: despensa, planes de comidas e historial de precios (Cambasket). */
export const VERSION_DATOS = 2;

export interface Datos {
  version: number;
  listas: Lista[];
  sitios: Sitio[];
  tiendas: Tienda[];
  /** Últimos precios conocidos: los online se reemplazan en cada búsqueda. */
  ofertas: Oferta[];
  elecciones: Eleccion[];

  despensas: Despensa[];
  articulos: Articulo[];
  movimientos: Movimiento[];
  mercados: Mercado[];
  planes: Plan[];
  comidas: Comida[];
  marcas: ItemCatalogo[];
  unidades: ItemCatalogo[];
  categorias: ItemCatalogo[];
  /** Historial de precios por tienda y producto, para detectar ofertas. */
  historial: Record<string, SeriePrecio>;
}

/** Unidades con las que arranca la app (se pueden renombrar o apagar). */
export const UNIDADES_INICIALES = ['Unidad', 'kg', 'g', 'L', 'ml', 'Paquete', 'Docena'];

export function datosVacios(): Datos {
  return {
    version: VERSION_DATOS,
    listas: [],
    sitios: [],
    tiendas: [],
    ofertas: [],
    elecciones: [],
    despensas: [],
    articulos: [],
    movimientos: [],
    mercados: [],
    planes: [],
    comidas: [],
    marcas: [],
    unidades: UNIDADES_INICIALES.map((nombre, i) => ({ id: `u${i + 1}`, nombre, activo: true })),
    categorias: [],
    historial: {},
  };
}

/** Completa lo que falte (datos de la versión 1 o de un respaldo viejo). */
export function migrar(leidos: Partial<Datos>): Datos {
  const base = datosVacios();
  const datos: Datos = { ...base, ...leidos, version: VERSION_DATOS };
  if (!leidos.unidades?.length) datos.unidades = base.unidades;
  return datos;
}

let datos: Datos = cargar();

function cargar(): Datos {
  try {
    const texto = localStorage.getItem(CLAVE);
    if (!texto) return datosVacios();
    return migrar(JSON.parse(texto) as Partial<Datos>);
  } catch {
    return datosVacios();
  }
}

function guardar(): void {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(datos));
  } catch {
    // Lleno: se recorta el historial de precios (lo más prescindible) y se reintenta.
    datos.historial = podarHistorial(datos.historial, 300);
    localStorage.setItem(CLAVE, JSON.stringify(datos));
  }
}

export function leer(): Readonly<Datos> {
  return datos;
}

/** Cambia los datos y los guarda: `cambiar((d) => { d.listas.push(...) })`. */
export function cambiar(cambio: (datos: Datos) => void): void {
  cambio(datos);
  guardar();
}

/** Reemplaza todo (al importar un respaldo). */
export function reemplazar(nuevos: Datos): void {
  datos = migrar(nuevos);
  guardar();
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
