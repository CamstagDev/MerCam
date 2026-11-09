// Un buscador sabe leer los precios de un tipo de tienda online. Muchas
// cadenas usan la misma plataforma (VTEX, por ejemplo), así que un mismo
// buscador sirve para varias. Para sumar una plataforma o una cadena con
// sitio propio: un archivo nuevo en esta carpeta y una línea en registro.ts.

export interface ResultadoBuscador {
  titulo: string;
  marca?: string;
  precio: number;
  precioLista?: number;
  url?: string;
}

export interface Buscador {
  id: string;
  /** true si el sitio (su origen, p. ej. https://www.tienda.com) usa esta plataforma. */
  reconoce(origen: string): Promise<boolean>;
  /** Busca un texto en la tienda. Los precios ya incluyen los descuentos del día. */
  buscar(origen: string, texto: string): Promise<ResultadoBuscador[]>;
}
