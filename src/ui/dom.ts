// Ayudas mínimas para armar pantallas sin framework.

type Hijo = Node | string | null | undefined | false;

export function el<K extends keyof HTMLElementTagNameMap>(
  etiqueta: K,
  atributos: Record<string, string | (() => void) | undefined> = {},
  ...hijos: Hijo[]
): HTMLElementTagNameMap[K] {
  const nodo = document.createElement(etiqueta);
  for (const [nombre, valor] of Object.entries(atributos)) {
    if (nombre === 'onclick' && typeof valor === 'function') nodo.addEventListener('click', valor);
    else if (typeof valor === 'string') nodo.setAttribute(nombre, valor);
  }
  for (const hijo of hijos) if (hijo) nodo.append(hijo);
  return nodo;
}

export function boton(texto: string, alTocar: () => void, clase = ''): HTMLButtonElement {
  return el('button', { type: 'button', class: clase, onclick: alTocar }, texto);
}

export function enlace(texto: string, ruta: string, clase = 'tarjeta'): HTMLAnchorElement {
  return el('a', { href: `#/${ruta}`, class: clase }, texto);
}

export interface Campo {
  nombre: string;
  etiqueta: string;
  tipo?: string;
  requerido?: boolean;
  /** Valor inicial. */
  valor?: string;
  /** Si se indica, el campo es una lista desplegable con estas opciones. */
  opciones?: { valor: string; texto: string }[];
  /** Sugerencias para autocompletar (un <datalist>). */
  sugerencias?: string[];
  /** Para números con decimales (cantidades): "any". */
  paso?: string;
}

let datalists = 0;

export function campo(c: Campo): HTMLElement {
  if (c.opciones) {
    const select = el('select', { name: c.nombre, 'aria-label': c.etiqueta, title: c.etiqueta });
    for (const o of c.opciones) select.append(el('option', { value: o.valor }, o.texto));
    if (c.valor !== undefined) select.value = c.valor;
    if (c.requerido) select.required = true;
    return select;
  }
  const input = el('input', { name: c.nombre, placeholder: c.etiqueta, 'aria-label': c.etiqueta, title: c.etiqueta, type: c.tipo ?? 'text' });
  if (c.paso) input.step = c.paso;
  if (c.valor !== undefined) input.value = c.valor;
  if (c.requerido) input.required = true;
  if (!c.sugerencias?.length) return input;
  const id = `sugerencias-${++datalists}`;
  input.setAttribute('list', id);
  return el('span', { class: 'con-sugerencias' }, input, el('datalist', { id }, ...c.sugerencias.map((s) => el('option', { value: s }))));
}

/** Un formulario de una línea: campos + botón. Devuelve los valores al enviar. */
export function formulario(
  campos: Campo[],
  textoBoton: string,
  alEnviar: (valores: Record<string, string>) => void,
  opciones: { limpiar?: boolean } = {},
): HTMLFormElement {
  const form = el('form', { class: 'formulario' }, ...campos.map(campo));
  form.append(el('button', { type: 'submit' }, textoBoton));
  form.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const valores = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
    alEnviar(valores);
    if (opciones.limpiar !== false) form.reset();
  });
  return form;
}

/** Un bloque plegable ("Editar", "Registrar compra"...). */
export function plegable(titulo: string, ...contenido: Hijo[]): HTMLDetailsElement {
  return el('details', { class: 'plegable' }, el('summary', {}, titulo), ...contenido);
}

/** Casilla para seleccionar filas. */
export function casilla(marcada: boolean, alCambiar: (marcada: boolean) => void, etiqueta = 'Seleccionar'): HTMLInputElement {
  const input = el('input', { type: 'checkbox', 'aria-label': etiqueta });
  input.checked = marcada;
  input.addEventListener('change', () => alCambiar(input.checked));
  return input;
}

export function precio(valor: number, moneda: string): string {
  return `${moneda} ${valor.toLocaleString('es', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/** Pesos colombianos: sin decimales, redondeado hacia arriba (como en Cambasket). */
export function pesos(valor: number): string {
  return `$${Math.ceil(valor).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
}

/** Cantidades (kg, litros) con hasta 3 decimales y sin ceros de más. */
export function cantidad(valor: number): string {
  return valor.toLocaleString('es-CO', { maximumFractionDigits: 3 });
}

export function fechaCorta(iso: string): string {
  const fecha = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return fecha.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** "2026-11-19T10:30" para un <input type="datetime-local">. */
export function fechaParaInput(fecha = new Date()): string {
  const d = (n: number) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${d(fecha.getMonth() + 1)}-${d(fecha.getDate())}T${d(fecha.getHours())}:${d(fecha.getMinutes())}`;
}

export function insignia(texto: string, clase = '', titulo?: string): HTMLSpanElement {
  return el('span', { class: `insignia ${clase}`, title: titulo }, texto);
}

export function vacio(texto: string): HTMLParagraphElement {
  return el('p', { class: 'vacio' }, texto);
}

/** Línea de precios en SVG (sin librerías): el más reciente a la derecha. */
export function minigrafico(valores: number[]): SVGSVGElement | null {
  if (valores.length < 2) return null;
  const ancho = 120;
  const alto = 28;
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const rango = max - min || 1;
  const puntos = valores
    .map((v, i) => `${((i / (valores.length - 1)) * ancho).toFixed(1)},${(alto - 2 - ((v - min) / rango) * (alto - 4)).toFixed(1)}`)
    .join(' ');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${ancho} ${alto}`);
  svg.setAttribute('class', 'minigrafico');
  svg.setAttribute('aria-hidden', 'true');
  const linea = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  linea.setAttribute('points', puntos);
  svg.append(linea);
  return svg;
}
