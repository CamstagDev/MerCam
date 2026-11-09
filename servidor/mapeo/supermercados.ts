// Supermercados cerca de unas coordenadas, con Overpass (OpenStreetMap).

import type { Coordenadas, Tienda } from '../../compartido/tipos.ts';
import { pedirJson } from '../red.ts';

// Overpass tiene varios servidores públicos y a veces alguno está
// saturado: se prueban en orden hasta que uno responda.
const SERVIDORES_OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

/** Tipos de comercio de OpenStreetMap que cuentan como "supermercado". */
const TIPOS = ['supermarket', 'convenience', 'greengrocer', 'wholesale'];

export interface ElementoOsm {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export type TiendaMapeada = Omit<Tienda, 'id' | 'sitioId'> & { sitioWeb?: string };

export function consultaOverpass({ lat, lon }: Coordenadas, radioM: number): string {
  const filtro = `["shop"~"^(${TIPOS.join('|')})$"](around:${Math.round(radioM)},${lat},${lon})`;
  return `[out:json][timeout:25];(node${filtro};way${filtro};);out center tags;`;
}

/** Convierte la respuesta de Overpass en tiendas (sin decidir aún si venden online). */
export function leerElementos(elementos: ElementoOsm[]): TiendaMapeada[] {
  const tiendas: TiendaMapeada[] = [];
  for (const elemento of elementos) {
    const tags = elemento.tags ?? {};
    const nombre = tags.name ?? tags.brand;
    if (!nombre) continue;
    const lat = elemento.lat ?? elemento.center?.lat;
    const lon = elemento.lon ?? elemento.center?.lon;
    const calle = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ');
    tiendas.push({
      nombre,
      cadena: tags.brand,
      direccion: calle || undefined,
      coordenadas: lat !== undefined && lon !== undefined ? { lat, lon } : undefined,
      origen: 'mapeada',
      osmId: `${elemento.type}/${elemento.id}`,
      sitioWeb: tags.website ?? tags['contact:website'] ?? tags['brand:website'],
    });
  }
  return tiendas;
}

export async function buscarSupermercados(centro: Coordenadas, radioM: number): Promise<TiendaMapeada[]> {
  const cuerpo = new URLSearchParams({ data: consultaOverpass(centro, radioM) }).toString();
  const fallos: string[] = [];
  for (const servidor of SERVIDORES_OVERPASS) {
    try {
      const { elements } = await pedirJson<{ elements: ElementoOsm[] }>(
        servidor,
        { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: cuerpo },
        30000,
      );
      return leerElementos(elements);
    } catch (error) {
      fallos.push(`${new URL(servidor).host}: ${error instanceof Error ? error.message : error}`);
    }
  }
  throw new Error(`Ningún servidor de OpenStreetMap respondió (${fallos.join('; ')})`);
}
