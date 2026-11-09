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

/** Un formulario de una línea: campos + botón. Devuelve los valores al enviar. */
export function formulario(
  campos: { nombre: string; etiqueta: string; tipo?: string; requerido?: boolean }[],
  textoBoton: string,
  alEnviar: (valores: Record<string, string>) => void,
): HTMLFormElement {
  const form = el('form', { class: 'formulario' });
  for (const campo of campos) {
    const input = el('input', { name: campo.nombre, placeholder: campo.etiqueta, type: campo.tipo ?? 'text' });
    if (campo.requerido) input.required = true;
    form.append(input);
  }
  form.append(el('button', { type: 'submit' }, textoBoton));
  form.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const valores = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
    alEnviar(valores);
    form.reset();
  });
  return form;
}

export function precio(valor: number, moneda: string): string {
  return `${moneda} ${valor.toLocaleString('es', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function vacio(texto: string): HTMLParagraphElement {
  return el('p', { class: 'vacio' }, texto);
}
