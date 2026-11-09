// Las cadenas de supermercados, una por archivo JSON en esta carpeta
// (exito.json, mercamio.json...). Para sumar o cambiar una cadena basta
// con editar, copiar o borrar su archivo y reiniciar el servidor; no hace
// falta tocar código salvo que necesite un buscador nuevo.
//
// Formato de cada archivo:
//   id            igual al nombre del archivo
//   nombre        como se muestra
//   pais          código ISO (CO)
//   alias         palabras que identifican sus tiendas en OpenStreetMap
//                 (nombre o marca, sin tildes ni mayúsculas)
//   tiendaOnline  { url, adaptador } o null si se sabe que no vende online
//   config        opcional: datos que su buscador necesita
//   notas         opcional: lo que haya que saber de la cadena

import { readdirSync, readFileSync } from 'node:fs';
import type { TiendaOnline } from '../../compartido/tipos.ts';

export interface Cadena {
  id: string;
  nombre: string;
  pais: string;
  alias: string[];
  tiendaOnline: TiendaOnline | null;
  config?: Record<string, string>;
  notas?: string;
}

const CARPETA = new URL('./', import.meta.url);

export function normalizarNombre(nombre: string): string {
  return nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function validarCadena(datos: unknown, archivo: string): Cadena {
  const c = datos as Partial<Cadena>;
  const error = (motivo: string) => new Error(`${archivo}: ${motivo}`);
  if (!c || typeof c !== 'object') throw error('no es un objeto');
  if (!c.id || `${c.id}.json` !== archivo) throw error('"id" tiene que ser igual al nombre del archivo');
  if (!c.nombre) throw error('falta "nombre"');
  if (!Array.isArray(c.alias) || !c.alias.length) throw error('"alias" tiene que ser una lista con al menos una palabra');
  if (c.tiendaOnline !== null && (!c.tiendaOnline?.url || !c.tiendaOnline.adaptador)) {
    throw error('"tiendaOnline" tiene que ser { url, adaptador } o null');
  }
  return { pais: 'CO', ...c, alias: c.alias.map(normalizarNombre) } as Cadena;
}

function cargar(): Cadena[] {
  return readdirSync(CARPETA)
    .filter((archivo) => archivo.endsWith('.json'))
    .sort()
    .map((archivo) => validarCadena(JSON.parse(readFileSync(new URL(archivo, CARPETA), 'utf8')), archivo));
}

export const CADENAS: Cadena[] = cargar();

export function cadenaPorId(id: string): Cadena | undefined {
  return CADENAS.find((c) => c.id === id);
}

function escapar(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** La cadena de una tienda de OpenStreetMap, por su nombre o su marca. */
export function cadenaDeTienda(...nombres: (string | undefined)[]): Cadena | undefined {
  for (const nombre of nombres) {
    if (!nombre) continue;
    const limpio = normalizarNombre(nombre);
    const cadena = CADENAS.find((c) => c.alias.some((a) => new RegExp(`\\b${escapar(a)}\\b`).test(limpio)));
    if (cadena) return cadena;
  }
  return undefined;
}
