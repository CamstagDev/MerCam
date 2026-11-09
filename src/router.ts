// Navegación entre pantallas por hash (#/lista?id=...), como en SudoCam.
// Una sola página: funciona igual en el navegador que dentro de Capacitor.

export interface Pantalla {
  titulo: string | ((params: URLSearchParams) => string);
  /** Ruta del botón "volver"; sin ella no hay botón. */
  volverA?: string | ((params: URLSearchParams) => string);
  render(contenedor: HTMLElement, params: URLSearchParams): void;
}

export const RUTA_INICIO = 'inicio';

const pantallas = new Map<string, Pantalla>();
let alCambiar: (pantalla: Pantalla, params: URLSearchParams) => void = () => {};

export function registrarPantalla(ruta: string, pantalla: Pantalla): void {
  pantallas.set(ruta, pantalla);
}

function mostrar(): void {
  const [ruta = '', consulta = ''] = window.location.hash.replace(/^#\/?/, '').split('?');
  const pantalla = pantallas.get(ruta) ?? pantallas.get(RUTA_INICIO);
  if (pantalla) alCambiar(pantalla, new URLSearchParams(consulta));
}

/** navegar('lista', { id }) -> #/lista?id=... (si ya estamos ahí, redibuja). */
export function navegar(ruta: string, params: Record<string, string> = {}): void {
  const consulta = new URLSearchParams(params).toString();
  const hash = `#/${ruta}${consulta ? `?${consulta}` : ''}`;
  if (window.location.hash === hash) mostrar();
  else window.location.hash = hash;
}

export function redibujar(): void {
  mostrar();
}

export function iniciarRouter(cuandoCambie: typeof alCambiar): void {
  alCambiar = cuandoCambie;
  window.addEventListener('hashchange', mostrar);
  mostrar();
}
