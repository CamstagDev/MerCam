// Tipos que comparten la app (src/) y el servidor de búsqueda (servidor/).
//
// Cómo encaja todo:
//
//   Sitio      una dirección que el usuario crea ("Casa", "Trabajo"). Al
//              crearla se "mapea": se buscan los supermercados cercanos y
//              si tienen tienda online. Esto se hace pocas veces.
//   Tienda     un supermercado de un sitio. Las mapeadas vienen del mapeo;
//              las manuales (almacenes de barrio, ferias) las agrega el
//              usuario, con sus precios a mano.
//   Lista      la lista de compras: productos, opcionalmente con marca.
//   Oferta     un producto concreto con su precio en una tienda. Las de
//              tiendas online se actualizan cada vez que se busca la lista;
//              las manuales las mantiene el usuario.
//   Eleccion   qué oferta eligió el usuario para cada producto. Con eso se
//              arma la "minilista": qué comprar en cada tienda.

export interface Coordenadas {
  lat: number;
  lon: number;
}

export interface Sitio extends Coordenadas {
  id: string;
  nombre: string;
  direccion: string;
  /** Radio de búsqueda de supermercados, en metros. */
  radioM: number;
  /** Cuándo se mapeó por última vez (ISO), o null si nunca. */
  mapeado: string | null;
  /**
   * De dónde salieron lat/lon: el GPS o el buscador del teléfono (exactos,
   * se reusan) o el servidor con OpenStreetMap (aproximado, se vuelve a
   * buscar la dirección al mapear de nuevo).
   */
  fuente?: 'gps' | 'telefono' | 'servidor';
}

/** Si la tienda vende online y con qué adaptador se la busca. */
export interface TiendaOnline {
  url: string;
  /** Id de un adaptador de servidor/buscadores (p. ej. 'vtex'). */
  adaptador: string;
  /** Para cadenas con precio por sede (Mercamio): el id de esta sede. */
  sede?: string;
}

export interface Tienda {
  id: string;
  sitioId: string;
  nombre: string;
  /** Cadena a la que pertenece ("Carrefour"), si se sabe. */
  cadena?: string;
  direccion?: string;
  coordenadas?: Coordenadas;
  origen: 'mapeada' | 'manual';
  /** null: se revisó y no vende online. undefined: no se sabe todavía. */
  online?: TiendaOnline | null;
  /** Id del nodo de OpenStreetMap, para no duplicarla al volver a mapear. */
  osmId?: string;
}

export interface Producto {
  id: string;
  nombre: string;
  /** Si se indica, se buscan primero las ofertas de esa marca. */
  marca?: string;
  cantidad: number;
}

export interface Lista {
  id: string;
  nombre: string;
  productos: Producto[];
  creada: string;
}

export interface Oferta {
  tiendaId: string;
  productoId: string;
  titulo: string;
  marca?: string;
  /** Precio final, con descuentos del día si los hay. */
  precio: number;
  /** Precio sin descuento, si la tienda lo muestra. */
  precioLista?: number;
  moneda: string;
  /** Página del producto en la tienda online (el usuario compra ahí). */
  url?: string;
  origen: 'online' | 'manual';
  actualizada: string;
}

export interface Eleccion {
  listaId: string;
  productoId: string;
  oferta: Oferta;
}

// ---- Contrato HTTP con el servidor ----

export interface PedidoMapeo {
  direccion: string;
  radioM: number;
  /**
   * Si la app ya sabe dónde es (GPS o el buscador de direcciones del
   * teléfono), el servidor no busca la dirección en OpenStreetMap.
   */
  coordenadas?: Coordenadas;
}

export interface RespuestaMapeo {
  coordenadas: Coordenadas;
  direccionEncontrada: string;
  tiendas: Omit<Tienda, 'id' | 'sitioId'>[];
}

export interface PedidoBusqueda {
  tiendas: Pick<Tienda, 'id' | 'nombre' | 'online'>[];
  productos: Pick<Producto, 'id' | 'nombre' | 'marca'>[];
}

export interface RespuestaBusqueda {
  ofertas: Oferta[];
  /** Tiendas en las que la búsqueda falló, con el motivo. */
  errores: { tiendaId: string; motivo: string }[];
}
