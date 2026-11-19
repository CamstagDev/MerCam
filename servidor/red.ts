// fetch con tiempo límite y un User-Agent que dice quiénes somos (lo piden
// Nominatim y Overpass, y es lo correcto con cualquier tienda).

// Este código corre en el servidor (Node) y también dentro de la app de
// Android, donde no existe process: por eso se lee así.
export function entorno(nombre: string): string | undefined {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[nombre];
}

export const USER_AGENT = 'MerCam/0.1 (+https://github.com/CamstagDev/MerCam)';

export async function pedir(url: string, opciones: RequestInit = {}, limiteMs = 15000): Promise<Response> {
  const respuesta = await fetch(url, {
    ...opciones,
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json', ...opciones.headers },
    signal: AbortSignal.timeout(limiteMs),
  });
  if (!respuesta.ok) throw new Error(`${respuesta.status} ${respuesta.statusText} en ${new URL(url).host}`);
  return respuesta;
}

export async function pedirJson<T>(url: string, opciones: RequestInit = {}, limiteMs?: number): Promise<T> {
  const respuesta = await pedir(url, opciones, limiteMs);
  return (await respuesta.json()) as T;
}
