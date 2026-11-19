// El buscador del servidor, corriendo dentro de la app de Android.
//
// En el teléfono no hay un servidor al que llamar (localhost es el propio
// teléfono), así que la app hace ella misma lo que hace servidor/index.ts.
// Puede porque Capacitor manda los fetch por la red nativa de Android
// (CapacitorHttp en capacitor.config.json): así no los frena CORS, que es
// lo que en el navegador obliga a usar el servidor.

import { buscarLista } from '../../servidor/busqueda.ts';
import { registrarCadenas } from '../../servidor/cadenas/cadenas.ts';
import { mapearZona } from '../../servidor/mapear.ts';

const archivos = import.meta.glob('../../servidor/cadenas/*.json', { eager: true, import: 'default' });
registrarCadenas(Object.fromEntries(Object.entries(archivos).map(([ruta, datos]) => [ruta.split('/').pop()!, datos])));

export { buscarLista, mapearZona };
