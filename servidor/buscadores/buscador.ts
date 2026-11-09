// Un buscador sabe leer los precios de un tipo de tienda online. Muchas
// cadenas usan la misma plataforma (VTEX, por ejemplo), así que un mismo
// buscador sirve para varias. Para sumar una plataforma o una cadena con
// sitio propio: un archivo nuevo en esta carpeta y una línea en registro.ts.

import type { Coordenadas, TiendaOnline } from '../../compartido/tipos.ts';
import type { TiendaMapeada } from '../mapeo/supermercados.ts';

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
  buscar(online: TiendaOnline, texto: string): Promise<ResultadoBuscador[]>;
  /**
   * Para cadenas con precio distinto en cada sede y su propia lista de
   * sedes (Mercamio): las que quedan dentro del radio, ya con `online`.
   * Al mapear reemplazan a las de OpenStreetMap de esa cadena.
   */
  sedesCerca?(centro: Coordenadas, radioM: number): Promise<TiendaMapeada[]>;
  /** Id del archivo de servidor/cadenas cuyas tiendas de OpenStreetMap reemplaza `sedesCerca`. */
  cadenaId?: string;
}
