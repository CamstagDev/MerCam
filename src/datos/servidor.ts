// Llamadas al servidor de búsqueda (servidor/index.ts).
//
// En el navegador (npm run dev) se usa /api y Vite lo pasa al servidor
// local. En Android hace falta su dirección completa: VITE_SERVIDOR en un
// archivo .env (p. ej. VITE_SERVIDOR=http://192.168.1.10:3010).

import type { PedidoBusqueda, PedidoMapeo, RespuestaBusqueda, RespuestaMapeo } from '../../compartido/tipos.ts';

const BASE = (import.meta.env.VITE_SERVIDOR as string | undefined)?.replace(/\/$/, '') ?? '';

async function enviar<T>(ruta: string, cuerpo: unknown): Promise<T> {
  const respuesta = await fetch(`${BASE}/api/${ruta}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  });
  const json = (await respuesta.json().catch(() => ({}))) as T & { error?: string };
  if (!respuesta.ok) throw new Error(json.error ?? `El servidor respondió ${respuesta.status}`);
  return json;
}

export const mapear = (pedido: PedidoMapeo) => enviar<RespuestaMapeo>('mapear', pedido);
export const buscar = (pedido: PedidoBusqueda) => enviar<RespuestaBusqueda>('buscar', pedido);
