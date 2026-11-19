// Carga las cadenas desde los JSON de esta carpeta (solo en Node: el
// servidor y las pruebas). Basta con importar este archivo.

import { readdirSync, readFileSync } from 'node:fs';
import { registrarCadenas } from './cadenas.ts';

const CARPETA = new URL('./', import.meta.url);

registrarCadenas(
  Object.fromEntries(
    readdirSync(CARPETA)
      .filter((archivo) => archivo.endsWith('.json'))
      .map((archivo) => [archivo, JSON.parse(readFileSync(new URL(archivo, CARPETA), 'utf8'))]),
  ),
);
