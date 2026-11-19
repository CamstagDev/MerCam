// Mapear supermercados y buscar precios.
//
// En el navegador (npm run dev) se llama al servidor de búsqueda
// (servidor/index.ts) por /api, y Vite lo pasa al servidor local.
//
// En Android la app busca por su cuenta (motorLocal.ts), sin servidor.
// Si igual se quiere usar uno, se pone su dirección completa en VITE_SERVIDOR
// en un archivo .env (p. ej. VITE_SERVIDOR=http://192.168.1.10:3010).

import { Capacitor } from '@capacitor/core';
import type { PedidoBusqueda, PedidoMapeo, RespuestaBusqueda, RespuestaMapeo } from '../../compartido/tipos.ts';

const SERVIDOR = (import.meta.env.VITE_SERVIDOR as string | undefined)?.replace(/\/$/, '');
const BASE = SERVIDOR ?? '';
const enTelefono = () => Capacitor.isNativePlatform() && !SERVIDOR;

async function enviar<T>(ruta: string, cuerpo: unknown): Promise<T> {
  let respuesta: Response;
  try {
    respuesta = await fetch(`${BASE}/api/${ruta}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
    });
  } catch {
    throw new Error('No hay conexión con el servidor de búsqueda. ¿Está abierto "Iniciar MerCam"?');
  }
  const json = (await respuesta.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!respuesta.ok) throw new Error(json?.error ?? `El servidor respondió ${respuesta.status}`);
  if (!json) throw new Error('El servidor de búsqueda no respondió bien. ¿Está abierto "Iniciar MerCam"?');
  return json;
}

export async function mapear(pedido: PedidoMapeo): Promise<RespuestaMapeo> {
  if (enTelefono()) return (await import('./motorLocal.ts')).mapearZona(pedido);
  return enviar<RespuestaMapeo>('mapear', pedido);
}

export async function buscar(pedido: PedidoBusqueda): Promise<RespuestaBusqueda> {
  if (enTelefono()) return (await import('./motorLocal.ts')).buscarLista(pedido);
  return enviar<RespuestaBusqueda>('buscar', pedido);
}
