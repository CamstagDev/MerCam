// Despensa y planes de comidas (lo que venía de Cambasket): stock, precio
// promedio, lo separado por los planes, ejecutar una comida, marcar como
// comprado lo de una lista y armar la lista de lo que falta para un plan.
//
// Lógica pura sobre los datos (sin pantalla ni localStorage) para poder
// probarla (tests/despensa.test.ts). Las funciones que cambian algo
// reciben los datos y los modifican; la pantalla las llama dentro de
// `cambiar(...)` para que se guarden.

import type { Articulo, Comida, Movimiento, Producto } from '../../compartido/tipos.ts';
import type { Datos } from '../datos/almacen.ts';
import { anotarPrecio } from './historial.ts';

type Id = () => string;

/** Las cantidades (kg, litros) admiten hasta 3 decimales. */
export function redondearCantidad(valor: number): number {
  return Math.round(valor * 1000) / 1000;
}

function cronologico(a: Movimiento, b: Movimiento): number {
  return a.fecha.localeCompare(b.fecha);
}

/**
 * Stock de un artículo: se reproducen, en orden, sus movimientos activos.
 * Un consumo nunca deja el stock por debajo de cero.
 */
export function calcularStock(movimientos: Movimiento[]): number {
  let stock = 0;
  for (const m of movimientos.filter((x) => x.activo).sort(cronologico)) {
    stock = m.tipo === 'compra' ? stock + m.cantidad : Math.max(stock - m.cantidad, 0);
  }
  return redondearCantidad(stock);
}

/**
 * Precio de referencia por unidad: promedio ponderado por cantidad de las
 * compras activas (una compra grande pesa más que una chica). En pesos,
 * sin decimales, redondeado hacia arriba. Sin compras, undefined.
 */
export function precioPromedio(movimientos: Movimiento[]): number | undefined {
  const compras = movimientos.filter((m) => m.activo && m.tipo === 'compra' && m.precioTotal);
  const cantidad = compras.reduce((a, m) => a + m.cantidad, 0);
  if (!(cantidad > 0)) return undefined;
  return Math.ceil(compras.reduce((a, m) => a + (m.precioTotal ?? 0), 0) / cantidad);
}

export function precioUnitario(m: Movimiento): number | undefined {
  return m.precioTotal && m.cantidad > 0 ? Math.ceil(m.precioTotal / m.cantidad) : undefined;
}

/** Cuánto piden las comidas pendientes (de cualquier plan, o de uno). */
export function separado(comidas: Comida[], articuloId: string, planId?: string): number {
  return redondearCantidad(
    comidas
      .filter((c) => !c.ejecutada && (!planId || c.planId === planId))
      .flatMap((c) => c.lineas)
      .filter((l) => l.articuloId === articuloId)
      .reduce((a, l) => a + l.cantidad, 0),
  );
}

export interface EstadoArticulo {
  stock: number;
  separado: number;
  /** stock − separado. Negativo: hace falta comprar para cumplir los planes. */
  disponible: number;
  precioPromedio?: number;
  enLista: boolean;
}

export function estadoArticulo(datos: Pick<Datos, 'movimientos' | 'comidas' | 'listas'>, articuloId: string): EstadoArticulo {
  const movimientos = datos.movimientos.filter((m) => m.articuloId === articuloId);
  const stock = calcularStock(movimientos);
  const sep = separado(datos.comidas, articuloId);
  return {
    stock,
    separado: sep,
    disponible: redondearCantidad(stock - sep),
    precioPromedio: precioPromedio(movimientos),
    enLista: datos.listas.some((l) => l.productos.some((p) => p.articuloId === articuloId)),
  };
}

/** Artículos agrupados por nombre general, para no mostrar cada variante suelta. */
export function agruparPorGenerico(articulos: Articulo[]): { generico: string; articulos: Articulo[] }[] {
  const grupos = new Map<string, { generico: string; articulos: Articulo[] }>();
  for (const a of [...articulos].sort((x, y) => x.nombre.localeCompare(y.nombre))) {
    const clave = a.generico.trim().toLowerCase();
    if (!grupos.has(clave)) grupos.set(clave, { generico: a.generico, articulos: [] });
    grupos.get(clave)!.articulos.push(a);
  }
  return [...grupos.values()].sort((a, b) => a.generico.localeCompare(b.generico));
}

// ---- Comidas ----

export interface Faltante {
  articuloId: string;
  nombre: string;
  necesario: number;
  disponible: number;
}

/**
 * Ejecuta una comida: descuenta del stock lo que pide (un consumo por
 * artículo). Si falta stock de algo no hace nada y devuelve qué falta.
 */
export function ejecutarComida(datos: Datos, comidaId: string, nuevoId: Id, ahora = new Date()): Faltante[] {
  const comida = datos.comidas.find((c) => c.id === comidaId);
  if (!comida || comida.ejecutada) return [];
  const faltan: Faltante[] = [];
  for (const linea of comida.lineas) {
    const stock = calcularStock(datos.movimientos.filter((m) => m.articuloId === linea.articuloId));
    if (linea.cantidad > stock) {
      const articulo = datos.articulos.find((a) => a.id === linea.articuloId);
      faltan.push({ articuloId: linea.articuloId, nombre: articulo?.nombre ?? '?', necesario: linea.cantidad, disponible: stock });
    }
  }
  if (faltan.length || !comida.lineas.length) return faltan;
  const fecha = ahora.toISOString();
  for (const linea of comida.lineas) {
    datos.movimientos.push({
      id: nuevoId(),
      articuloId: linea.articuloId,
      tipo: 'consumo',
      cantidad: linea.cantidad,
      fecha,
      descripcion: comida.nombre,
      activo: true,
      comidaId: comida.id,
    });
  }
  comida.ejecutada = fecha;
  return [];
}

/** Deshace la ejecución: inhabilita sus consumos y la comida vuelve a separar stock. */
export function deshacerComida(datos: Datos, comidaId: string): void {
  const comida = datos.comidas.find((c) => c.id === comidaId);
  if (!comida?.ejecutada) return;
  for (const m of datos.movimientos) if (m.comidaId === comida.id && m.activo) m.activo = false;
  delete comida.ejecutada;
}

/**
 * Lo que hay que comprar para un plan: por cada artículo de sus comidas
 * pendientes, lo que no alcanza a cubrir el stock (teniendo en cuenta
 * también lo que separan los demás planes), sin pasarse de lo que pide
 * este plan.
 */
export function faltantesDePlan(datos: Pick<Datos, 'movimientos' | 'comidas'>, planId: string): { articuloId: string; cantidad: number }[] {
  const ids = new Set(
    datos.comidas.filter((c) => c.planId === planId && !c.ejecutada).flatMap((c) => c.lineas.map((l) => l.articuloId)),
  );
  const resultado: { articuloId: string; cantidad: number }[] = [];
  for (const articuloId of ids) {
    const delPlan = separado(datos.comidas, articuloId, planId);
    const total = separado(datos.comidas, articuloId);
    const stock = calcularStock(datos.movimientos.filter((m) => m.articuloId === articuloId));
    const falta = redondearCantidad(Math.min(delPlan, Math.max(total - stock, 0)));
    if (falta > 0) resultado.push({ articuloId, cantidad: falta });
  }
  return resultado;
}

/** Un producto de lista hecho a partir de un artículo (para buscarlo en los supermercados). */
export function productoDeArticulo(datos: Pick<Datos, 'marcas'>, articulo: Articulo, cantidad: number, nuevoId: Id): Producto {
  const marca = datos.marcas.find((m) => m.id === articulo.marcaId)?.nombre;
  const producto: Producto = { id: nuevoId(), nombre: articulo.nombre, marca, cantidad, articuloId: articulo.id };
  if (articulo.contenido && articulo.contenidoUnidadId) Object.assign(producto, { contenido: articulo.contenido, contenidoUnidadId: articulo.contenidoUnidadId });
  return producto;
}

/**
 * Agrega artículos a una lista. Si el artículo ya está en ella, suma la
 * cantidad en vez de repetirlo. Devuelve cuántos productos nuevos quedaron.
 */
export function agregarArticulosALista(
  datos: Datos,
  listaId: string,
  pedidos: { articuloId: string; cantidad: number; precioEstimado?: number }[],
  nuevoId: Id,
): number {
  const lista = datos.listas.find((l) => l.id === listaId);
  if (!lista) return 0;
  let nuevos = 0;
  for (const pedido of pedidos) {
    const articulo = datos.articulos.find((a) => a.id === pedido.articuloId);
    if (!articulo || !(pedido.cantidad > 0)) continue;
    const existente = lista.productos.find((p) => p.articuloId === articulo.id);
    if (existente) {
      existente.cantidad = redondearCantidad(existente.cantidad + pedido.cantidad);
      if (pedido.precioEstimado) existente.precioEstimado = pedido.precioEstimado;
    } else {
      const producto = productoDeArticulo(datos, articulo, pedido.cantidad, nuevoId);
      if (pedido.precioEstimado) producto.precioEstimado = pedido.precioEstimado;
      lista.productos.push(producto);
      nuevos++;
    }
  }
  return nuevos;
}

// ---- Marcar comprado ----

export interface ResultadoCompra {
  comprados: string[];
  errores: { productoId: string; motivo: string }[];
}

/**
 * Marca productos de una lista como comprados: el precio es el de la
 * oferta elegida (precio × cantidad) o, si no hay, el precio estimado.
 * Si el producto viene de la despensa, se registra la compra (suma stock,
 * con el precio y la tienda). En todos los casos el precio se anota en el
 * historial y el producto sale de la lista.
 */
export function marcarComprados(datos: Datos, listaId: string, productoIds: string[], nuevoId: Id, ahora = new Date()): ResultadoCompra {
  const lista = datos.listas.find((l) => l.id === listaId);
  const resultado: ResultadoCompra = { comprados: [], errores: [] };
  if (!lista) return resultado;
  for (const productoId of productoIds) {
    const producto = lista.productos.find((p) => p.id === productoId);
    if (!producto) continue;
    const eleccion = datos.elecciones.find((e) => e.listaId === listaId && e.productoId === productoId);
    const tienda = eleccion ? datos.tiendas.find((t) => t.id === eleccion.oferta.tiendaId) : undefined;
    const total = eleccion ? Math.ceil(eleccion.oferta.precio * producto.cantidad) : producto.precioEstimado;
    if (producto.articuloId && !(total && total > 0)) {
      resultado.errores.push({ productoId, motivo: `${producto.nombre}: sin precio (elige una oferta o anota un precio estimado)` });
      continue;
    }
    if (producto.articuloId && datos.articulos.some((a) => a.id === producto.articuloId)) {
      datos.movimientos.push({
        id: nuevoId(),
        articuloId: producto.articuloId,
        tipo: 'compra',
        cantidad: producto.cantidad,
        precioTotal: total,
        fecha: ahora.toISOString(),
        descripcion: eleccion ? eleccion.oferta.titulo : undefined,
        activo: true,
        tienda: tienda?.nombre,
      });
    }
    if (total && total > 0) {
      anotarPrecio(datos.historial, {
        producto: producto.nombre,
        titulo: eleccion?.oferta.titulo ?? producto.nombre,
        tienda: tienda?.nombre ?? 'Mis compras',
        tiendaId: tienda?.id,
        precio: eleccion ? eleccion.oferta.precio : Math.ceil(total / producto.cantidad),
        moneda: eleccion?.oferta.moneda ?? '$',
        origen: eleccion ? eleccion.oferta.origen : 'compra',
        fecha: ahora,
      });
    }
    lista.productos = lista.productos.filter((p) => p.id !== productoId);
    datos.elecciones = datos.elecciones.filter((e) => !(e.listaId === listaId && e.productoId === productoId));
    resultado.comprados.push(productoId);
  }
  return resultado;
}

/** Registra una compra hecha a mano desde la despensa (y anota el precio unitario en el historial). */
export function registrarCompra(
  datos: Datos,
  movimiento: Omit<Movimiento, 'id' | 'tipo' | 'activo'>,
  nuevoId: Id,
): Movimiento {
  const nuevo: Movimiento = { ...movimiento, id: nuevoId(), tipo: 'compra', activo: true };
  datos.movimientos.push(nuevo);
  const articulo = datos.articulos.find((a) => a.id === movimiento.articuloId);
  const unitario = precioUnitario(nuevo);
  if (articulo && unitario) {
    anotarPrecio(datos.historial, {
      producto: articulo.nombre,
      titulo: articulo.nombre,
      tienda: movimiento.tienda || 'Mis compras',
      precio: unitario,
      moneda: '$',
      origen: 'compra',
      fecha: movimiento.fecha,
    });
  }
  return nuevo;
}
