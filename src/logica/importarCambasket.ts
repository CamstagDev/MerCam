// Convierte los datos de Cambasket (las tablas de su base PostgreSQL) al
// formato de MerCam. El script scripts/importar-cambasket.ts lee la base y
// usa esta función; el archivo que deja se carga en la app desde
// "Respaldo".
//
// Qué se trae de cada basket del usuario:
//   basket                  -> despensa
//   productos (+genérico)   -> artículos
//   movimientos_stock       -> movimientos (compras y consumos)
//   items_lista_compras     -> una lista "Compras · <basket>"
//   mercados_guardados      -> mercados
//   planificadores / usos   -> planes / comidas
//   marcas, unidades, categorías del dueño -> catálogos
// Los usuarios, contactos e invitaciones no se traen: MerCam no tiene
// cuentas (todo vive en el teléfono).

import type { Articulo, Comida, Despensa, ItemCatalogo, Lista, Mercado, Movimiento, Plan } from '../../compartido/tipos.ts';

type Fila = Record<string, unknown>;

export interface TablasCambasket {
  baskets: Fila[];
  marcas: Fila[];
  unidades_medida: Fila[];
  categorias: Fila[];
  productos_genericos: Fila[];
  productos: Fila[];
  productos_categorias: Fila[];
  movimientos_stock: Fila[];
  items_lista_compras: Fila[];
  mercados_guardados: Fila[];
  mercados_guardados_productos: Fila[];
  planificadores: Fila[];
  usos: Fila[];
  usos_productos: Fila[];
}

export interface ImportacionCambasket {
  formato: 'mercam-importacion';
  origen: 'cambasket';
  despensas: Despensa[];
  articulos: Articulo[];
  movimientos: Movimiento[];
  mercados: Mercado[];
  planes: Plan[];
  comidas: Comida[];
  listas: Lista[];
  marcas: ItemCatalogo[];
  unidades: ItemCatalogo[];
  categorias: ItemCatalogo[];
}

const texto = (v: unknown) => (v === null || v === undefined ? undefined : String(v).trim() || undefined);
const numero = (v: unknown) => (v === null || v === undefined || v === '' ? undefined : Number(v));
const fecha = (v: unknown, otra = new Date(0)) => (v instanceof Date ? v : v ? new Date(String(v)) : otra).toISOString();
const soloDia = (v: unknown) => (v ? fecha(v).slice(0, 10) : undefined);
/** Ids de MerCam para no chocar con los que ya existan: cb-<tabla>-<id>. */
const id = (tabla: string, v: unknown) => `cb-${tabla}-${String(v)}`;

export function convertirCambasket(t: TablasCambasket, ahora = new Date()): ImportacionCambasket {
  const genericos = new Map(t.productos_genericos.map((g) => [String(g.id), texto(g.nombre) ?? '']));
  const catalogo = (tabla: string, filas: Fila[]): ItemCatalogo[] =>
    filas.map((f) => ({ id: id(tabla, f.id), nombre: texto(f.nombre) ?? '?', descripcion: texto(f.descripcion), activo: Number(f.estado ?? 1) === 1 }));

  const articulos: Articulo[] = t.productos.map((p) => ({
    id: id('producto', p.id),
    despensaId: id('basket', p.id_basket),
    nombre: texto(p.nombre) ?? '?',
    generico: genericos.get(String(p.id_generico)) || texto(p.nombre) || '?',
    descripcion: texto(p.descripcion),
    unidadId: id('unidad', p.id_unidad_medida),
    marcaId: p.id_marca ? id('marca', p.id_marca) : undefined,
    categoriaIds: t.productos_categorias.filter((pc) => String(pc.id_producto) === String(p.id)).map((pc) => id('categoria', pc.id_categoria)),
    creado: fecha(p.fecha_creacion, ahora),
  }));

  // Consumos hechos por una comida: se enlazan para poder deshacerla.
  const comidaDeMovimiento = new Map(
    t.usos_productos.filter((up) => up.id_movimiento_stock).map((up) => [String(up.id_movimiento_stock), id('uso', up.id_uso)]),
  );

  const movimientos: Movimiento[] = t.movimientos_stock.map((m) => ({
    id: id('movimiento', m.id),
    articuloId: id('producto', m.id_producto),
    tipo: Number(m.tipo) === 1 ? 'compra' : 'consumo',
    cantidad: Number(m.cantidad),
    precioTotal: Number(m.tipo) === 1 ? numero(m.precio_total) : undefined,
    fecha: fecha(m.fecha, ahora),
    descripcion: texto(m.descripcion),
    activo: Number(m.estado ?? 1) === 1,
    comidaId: comidaDeMovimiento.get(String(m.id)),
  }));

  const despensas: Despensa[] = t.baskets.map((b) => ({
    id: id('basket', b.id),
    nombre: texto(b.nombre) ?? 'Despensa',
    descripcion: texto(b.descripcion),
    creada: fecha(b.fecha_creacion, ahora),
  }));

  const listas: Lista[] = despensas
    .map((d) => {
      const items = t.items_lista_compras.filter((i) => articulos.some((a) => a.id === id('producto', i.id_producto) && a.despensaId === d.id));
      return {
        id: id('lista', d.id),
        nombre: `Compras · ${d.nombre}`,
        creada: ahora.toISOString(),
        productos: items.map((i) => {
          const articulo = articulos.find((a) => a.id === id('producto', i.id_producto))!;
          const marca = t.marcas.find((m) => id('marca', m.id) === articulo.marcaId);
          return {
            id: id('item', i.id),
            nombre: articulo.nombre,
            marca: texto(marca?.nombre),
            cantidad: Number(i.cantidad) || 1,
            articuloId: articulo.id,
            precioEstimado: numero(i.precio_estimado),
          };
        }),
      };
    })
    .filter((l) => l.productos.length);

  const mercados: Mercado[] = t.mercados_guardados.map((m) => ({
    id: id('mercado', m.id),
    despensaId: id('basket', m.id_basket),
    nombre: texto(m.nombre) ?? 'Mercado',
    articuloIds: t.mercados_guardados_productos.filter((mp) => String(mp.id_mercado) === String(m.id)).map((mp) => id('producto', mp.id_producto)),
    creado: fecha(m.fecha_creacion, ahora),
  }));

  const planes: Plan[] = t.planificadores.map((p) => ({
    id: id('plan', p.id),
    despensaId: id('basket', p.id_basket),
    nombre: texto(p.nombre) ?? 'Plan',
    creado: fecha(p.fecha_creacion, ahora),
  }));

  const comidas: Comida[] = t.usos.map((u) => ({
    id: id('uso', u.id),
    planId: id('plan', u.id_planificador),
    nombre: texto(u.nombre) ?? 'Comida',
    fecha: soloDia(u.fecha),
    lineas: t.usos_productos
      .filter((up) => String(up.id_uso) === String(u.id))
      .map((up) => ({ id: id('uso-producto', up.id), articuloId: id('producto', up.id_producto), cantidad: Number(up.cantidad) })),
    ejecutada: Number(u.estado) === 1 ? fecha(u.fecha_ejecucion, ahora) : undefined,
    creada: fecha(u.fecha_creacion, ahora),
  }));

  return {
    formato: 'mercam-importacion',
    origen: 'cambasket',
    despensas,
    articulos,
    movimientos,
    mercados,
    planes,
    comidas,
    listas,
    marcas: catalogo('marca', t.marcas),
    unidades: catalogo('unidad', t.unidades_medida),
    categorias: catalogo('categoria', t.categorias),
  };
}

/**
 * Suma una importación a los datos. Lo que ya estaba (mismo id) se
 * reemplaza, así importar dos veces el mismo archivo no duplica nada.
 */
export function sumarImportacion<D extends Omit<ImportacionCambasket, 'formato' | 'origen'>>(datos: D, imp: Omit<ImportacionCambasket, 'formato' | 'origen'>): void {
  const claves = ['despensas', 'articulos', 'movimientos', 'mercados', 'planes', 'comidas', 'listas', 'marcas', 'unidades', 'categorias'] as const;
  for (const clave of claves) {
    const nuevos = imp[clave] as { id: string }[];
    const ids = new Set(nuevos.map((x) => x.id));
    const actuales = (datos[clave] as { id: string }[]).filter((x) => !ids.has(x.id));
    (datos as Record<string, unknown>)[clave] = [...actuales, ...nuevos];
  }
}
