// Dirección -> coordenadas, con Nominatim (OpenStreetMap). Es gratis pero
// pide como máximo una consulta por segundo; el mapeo se hace pocas veces,
// así que alcanza.

import type { Coordenadas } from '../../compartido/tipos.ts';
import { pedirJson } from '../red.ts';

interface ResultadoNominatim {
  lat: string;
  lon: string;
  display_name: string;
}

export async function geocodificar(direccion: string): Promise<{ coordenadas: Coordenadas; direccionEncontrada: string }> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', direccion);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');
  const [primero] = await pedirJson<ResultadoNominatim[]>(url.toString());
  if (!primero) throw new Error(`No se encontró la dirección "${direccion}"`);
  return {
    coordenadas: { lat: Number(primero.lat), lon: Number(primero.lon) },
    direccionEncontrada: primero.display_name,
  };
}
