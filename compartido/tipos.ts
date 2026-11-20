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
//
// La despensa (lo que venía de Cambasket):
//
//   Despensa   lo que hay en casa: artículos con su stock.
//   Articulo   un producto de la despensa ("Arroz Diana x 500g"), con su
//              nombre general ("Arroz"), unidad, marca y categorías.
//   Movimiento una compra (entra stock, con precio) o un consumo (sale).
//              El stock y el precio promedio se calculan de aquí.
//   Mercado    un grupo de artículos guardado ("Obligatorios del mes")
//              para pasarlo de una vez a una lista.
//   Plan       un plan de comidas. Sus Comidas usan artículos: lo que
//              piden queda "separado" hasta que se ejecutan (y entonces se
//              descuenta del stock). Lo que falta se convierte en una lista
//              para comparar precios en los supermercados cercanos.
//   SeriePrecio el historial de precios de un producto en una tienda, para
//              saber si hoy está en oferta comparado con lo de siempre.

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
  /** Artículo de la despensa al que corresponde: al comprarlo, suma stock. */
  articuloId?: string;
  /** Precio total estimado, si el usuario lo anota (o viene del historial). */
  precioEstimado?: number;
  /** Contenido de cada unidad (p. ej. 1000 con contenidoUnidadId de "ml"). */
  contenido?: number;
  /** Unidad de medida del contenido (catálogo de unidades). */
  contenidoUnidadId?: string;
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
  /** Contenido de los precios manuales (1 + L), para el precio por litro o kilo. */
  contenido?: number;
  contenidoUnidadId?: string;
  origen: 'online' | 'manual';
  actualizada: string;
}

export interface Eleccion {
  listaId: string;
  productoId: string;
  oferta: Oferta;
}

// ---- Despensa, planes de comidas e historial de precios ----

/** Marcas, unidades de medida y categorías: catálogos que se pueden apagar. */
export interface ItemCatalogo {
  id: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  /**
   * Solo unidades de medida: a qué magnitud corresponde y cuánto equivale
   * en su unidad base (L -> ml × 1000, kg -> g × 1000, Docena -> und × 12).
   * Con eso se comparan precios por litro o por kilo.
   */
  base?: 'ml' | 'g' | 'und';
  factor?: number;
}

export interface Despensa {
  id: string;
  nombre: string;
  descripcion?: string;
  creada: string;
}

export interface Articulo {
  id: string;
  despensaId: string;
  /** Título ("Arroz Diana x 500g"). */
  nombre: string;
  /** Nombre general ("Arroz"): agrupa variantes y autocompleta. */
  generico: string;
  descripcion?: string;
  unidadId: string;
  marcaId?: string;
  categoriaIds: string[];
  /** Contenido de cada unidad (p. ej. 1000 con contenidoUnidadId de "ml"). */
  contenido?: number;
  contenidoUnidadId?: string;
  creado: string;
}

export interface Movimiento {
  id: string;
  articuloId: string;
  tipo: 'compra' | 'consumo';
  cantidad: number;
  /** Solo compras: lo que se pagó por toda la cantidad. */
  precioTotal?: number;
  fecha: string;
  descripcion?: string;
  /** Inhabilitado (false) no cuenta para el stock ni el precio promedio. */
  activo: boolean;
  /** Dónde se compró, si se sabe. */
  tienda?: string;
  /** Si lo generó una comida al ejecutarse. */
  comidaId?: string;
}

export interface Mercado {
  id: string;
  despensaId: string;
  nombre: string;
  articuloIds: string[];
  creado: string;
}

export interface Plan {
  id: string;
  despensaId: string;
  nombre: string;
  creado: string;
}

export interface LineaComida {
  id: string;
  articuloId: string;
  cantidad: number;
}

export interface Comida {
  id: string;
  planId: string;
  nombre: string;
  /** Día planeado (AAAA-MM-DD), opcional. */
  fecha?: string;
  lineas: LineaComida[];
  /** Cuándo se ejecutó (se descontó del stock); sin valor, está pendiente. */
  ejecutada?: string;
  creada: string;
}

export interface PuntoPrecio {
  /** Día (AAAA-MM-DD): un punto por día, el último visto. */
  dia: string;
  precio: number;
  precioLista?: number;
}

export interface SeriePrecio {
  /** tienda|título normalizado. */
  clave: string;
  /** Nombre del producto buscado, normalizado (para juntar series). */
  producto: string;
  titulo: string;
  tienda: string;
  tiendaId?: string;
  origen: 'online' | 'manual' | 'compra';
  moneda: string;
  puntos: PuntoPrecio[];
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
