// Dirección -> coordenadas, con Nominatim (OpenStreetMap). Es gratis pero
// pide como máximo una consulta por segundo; el mapeo se hace pocas veces,
// así que alcanza.
//
// Nominatim no entiende la placa colombiana ("Calle 73 Norte #2-22"): con
// ella casi nunca encuentra nada. Por eso, si la dirección tal cual no
// aparece, se prueba la calle sola ("Calle 73 Norte, Cali"), que queda a
// pocas cuadras y alcanza para buscar supermercados cerca.

import type { Coordenadas } from '../../compartido/tipos.ts';
import { entorno, pedirJson } from '../red.ts';

const PAISES = entorno('MERCAM_PAIS') ?? 'co';

interface ResultadoNominatim {
  lat: string;
  lon: string;
  display_name: string;
}

const ABREVIATURAS: [RegExp, string][] = [
  [/\b(cl|cll|clle)\.?(?=\s|\d)/gi, 'Calle'],
  [/\b(cra|kra|kr|cr|carr)\.?(?=\s|\d)/gi, 'Carrera'],
  [/\b(av|avda)\.?(?=\s|\d)/gi, 'Avenida'],
  [/\b(dg|diag)\.?(?=\s|\d)/gi, 'Diagonal'],
  [/\b(tv|transv|trans)\.?(?=\s|\d)/gi, 'Transversal'],
];

/** Las formas de la dirección que se le prueban a Nominatim, en orden. */
export function variantesDireccion(direccion: string): string[] {
  const original = direccion.replace(/\s+/g, ' ').trim();
  let calle = original;
  for (const [patron, nombre] of ABREVIATURAS) calle = calle.replace(patron, nombre);
  // Sin la placa: "# 2-22", "No. 2-22", "N° 28N - 23"...
  let sinPlaca = calle
    .replace(/\s*(#|n[o°º]\.?|num\.?|número)\s*\d+\s*[a-z]{0,3}\s*(bis)?\s*[-–]\s*\d+[a-z]?\b/gi, '')
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  // "6N" -> "6 Norte" ("5BIS" se deja igual).
  const norte = (texto: string) => texto.replace(/\b(\d+[a-z]?)\s*n\b/gi, '$1 Norte');
  calle = norte(calle);
  sinPlaca = norte(sinPlaca);
  return [...new Set([original, calle, sinPlaca])].filter(Boolean);
}

const esperar = (ms: number) => new Promise((listo) => setTimeout(listo, ms));

async function consultar(texto: string): Promise<ResultadoNominatim | undefined> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', texto);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');
  // Solo direcciones de Colombia por ahora (MERCAM_PAIS=co,ec para sumar países).
  url.searchParams.set('countrycodes', PAISES);
  const [primero] = await pedirJson<ResultadoNominatim[]>(url.toString());
  return primero;
}

export async function geocodificar(direccion: string): Promise<{ coordenadas: Coordenadas; direccionEncontrada: string }> {
  const variantes = variantesDireccion(direccion);
  for (const [i, texto] of variantes.entries()) {
    if (i > 0) await esperar(1100); // una consulta por segundo
    const encontrado = await consultar(texto);
    if (encontrado) {
      return {
        coordenadas: { lat: Number(encontrado.lat), lon: Number(encontrado.lon) },
        direccionEncontrada: encontrado.display_name,
      };
    }
  }
  throw new Error(`No se encontró la dirección "${direccion}". Prueba con "📍 Usar mi ubicación" o escribe la calle y la ciudad.`);
}
