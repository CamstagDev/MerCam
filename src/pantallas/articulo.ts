// Un artículo de la despensa: stock (y lo separado por los planes de
// comidas), precio promedio, registrar compras y consumos, su historial de
// movimientos (editar o inhabilitar) y su historial de precios por tienda,
// para saber cuándo está en oferta.

import type { Movimiento } from '../../compartido/tipos.ts';
import { cambiar, leer, nuevoId } from '../datos/almacen.ts';
import { agregarArticulosALista, calcularStock, estadoArticulo, precioUnitario, registrarCompra } from '../logica/despensa.ts';
import { TEXTO_VEREDICTO, analizarPrecio, dia, seriesDelProducto } from '../logica/historial.ts';
import { navegar, redibujar, type Pantalla } from '../router.ts';
import { boton, cantidad, el, fechaCorta, fechaParaInput, formulario, insignia, minigrafico, pesos, plegable, precio, vacio } from '../ui/dom.ts';
import { formularioArticulo, opcionesDeListas, resolverLista } from './comunes.ts';

function nombresDeTiendas(): string[] {
  const datos = leer();
  return [...new Set([...datos.tiendas.map((t) => t.nombre), ...datos.movimientos.map((m) => m.tienda ?? '')].filter(Boolean))].sort();
}

function filaMovimiento(m: Movimiento, unidad: string): HTMLElement {
  const esCompra = m.tipo === 'compra';
  const unitario = precioUnitario(m);
  const editar = formulario(
    [
      { nombre: 'cantidad', etiqueta: 'Cantidad', tipo: 'number', paso: 'any', valor: String(m.cantidad), requerido: true },
      ...(esCompra ? [{ nombre: 'precioTotal', etiqueta: 'Precio total', tipo: 'number', valor: String(m.precioTotal ?? ''), requerido: true }] : []),
      { nombre: 'fecha', etiqueta: 'Fecha', tipo: 'datetime-local', valor: fechaParaInput(new Date(m.fecha)), requerido: true },
      ...(esCompra ? [{ nombre: 'tienda', etiqueta: 'Tienda', valor: m.tienda ?? '', sugerencias: nombresDeTiendas() }] : []),
      { nombre: 'descripcion', etiqueta: 'Descripción', valor: m.descripcion ?? '' },
    ],
    'Guardar cambios',
    (v) => {
      const nuevaCantidad = Number(v.cantidad);
      if (!(nuevaCantidad > 0)) return;
      cambiar((d) => {
        const x = d.movimientos.find((y) => y.id === m.id);
        if (!x) return;
        x.cantidad = nuevaCantidad;
        x.fecha = new Date(v.fecha ?? '').toISOString();
        x.descripcion = v.descripcion?.trim() || undefined;
        if (esCompra) {
          x.precioTotal = Number(v.precioTotal) || x.precioTotal;
          x.tienda = v.tienda?.trim() || undefined;
        }
      });
      redibujar();
    },
    { limpiar: false },
  );
  return el(
    'li',
    { class: `movimiento${m.activo ? '' : ' cancelado'}` },
    el(
      'div',
      { class: 'movimiento-cabeza' },
      el(
        'span',
        {},
        el('strong', { class: esCompra ? 'entrada' : 'salida' }, `${esCompra ? '+' : '−'}${cantidad(m.cantidad)} ${unidad}`),
        ` ${m.descripcion ?? (esCompra ? 'Compra' : 'Consumo')}`,
        el(
          'small',
          {},
          ` · ${fechaCorta(m.fecha)}`,
          m.tienda ? ` · ${m.tienda}` : '',
          esCompra && m.precioTotal ? ` · ${pesos(m.precioTotal)}${unitario && m.cantidad !== 1 ? ` (${pesos(unitario)} c/u)` : ''}` : '',
        ),
        m.activo ? null : insignia('Inhabilitado', 'negativo'),
        m.comidaId ? insignia('Comida') : null,
      ),
      boton(m.activo ? 'Inhabilitar' : 'Habilitar', () => {
        cambiar((d) => {
          const x = d.movimientos.find((y) => y.id === m.id);
          if (x) x.activo = !x.activo;
        });
        redibujar();
      }, 'secundario'),
    ),
    m.comidaId ? null : plegable('Editar', editar),
  );
}

export const pantallaArticulo: Pantalla = {
  titulo: (params) => leer().articulos.find((a) => a.id === params.get('id'))?.nombre ?? 'Producto',
  volverA: (params) => `despensa?id=${leer().articulos.find((a) => a.id === params.get('id'))?.despensaId ?? ''}`,
  render(contenedor, params) {
    const datos = leer();
    const articulo = datos.articulos.find((a) => a.id === params.get('id'));
    if (!articulo) {
      contenedor.append(vacio('Este producto ya no existe.'));
      return;
    }
    const e = estadoArticulo(datos, articulo.id);
    const unidad = datos.unidades.find((u) => u.id === articulo.unidadId)?.nombre ?? '';
    const marca = datos.marcas.find((m) => m.id === articulo.marcaId)?.nombre;
    const categorias = articulo.categoriaIds.map((id) => datos.categorias.find((c) => c.id === id)?.nombre).filter(Boolean);
    const movimientos = datos.movimientos.filter((m) => m.articuloId === articulo.id).sort((a, b) => b.fecha.localeCompare(a.fecha));

    contenedor.append(
      el('p', { class: 'ayuda' }, [`General: ${articulo.generico}`, `Unidad: ${unidad}`, marca && `Marca: ${marca}`, categorias.length && categorias.join(', ')].filter(Boolean).join(' · ')),
      articulo.descripcion ? el('p', {}, articulo.descripcion) : '',
      el(
        'div',
        { class: 'cifras' },
        el('div', { class: 'cifra' }, el('small', {}, 'En stock'), el('strong', {}, `${cantidad(e.stock)} ${unidad}`)),
        e.separado > 0 ? el('div', { class: 'cifra' }, el('small', {}, 'Separado para comidas'), el('strong', {}, `${cantidad(e.separado)} ${unidad}`)) : null,
        e.separado > 0
          ? el('div', { class: `cifra${e.disponible < 0 ? ' negativo' : ''}` }, el('small', {}, 'Disponible'), el('strong', {}, `${cantidad(e.disponible)} ${unidad}`))
          : null,
        el('div', { class: 'cifra' }, el('small', {}, 'Precio promedio'), el('strong', {}, e.precioPromedio ? pesos(e.precioPromedio) : 'Sin compras')),
      ),
    );

    // ---- Registrar compra / consumo / pasar a una lista ----
    contenedor.append(
      plegable(
        '🛒 Registrar compra',
        formulario(
          [
            { nombre: 'cantidad', etiqueta: `Cantidad (${unidad})`, tipo: 'number', paso: 'any', requerido: true, valor: '1' },
            { nombre: 'precioTotal', etiqueta: 'Precio total pagado', tipo: 'number', requerido: true },
            { nombre: 'tienda', etiqueta: 'Tienda (opcional)', sugerencias: nombresDeTiendas() },
            { nombre: 'fecha', etiqueta: 'Fecha', tipo: 'datetime-local', valor: fechaParaInput(), requerido: true },
            { nombre: 'descripcion', etiqueta: 'Descripción (opcional)' },
          ],
          'Registrar compra',
          (v) => {
            const cant = Number(v.cantidad);
            const total = Number(v.precioTotal);
            if (!(cant > 0) || !(total > 0)) {
              alert('Ingresa una cantidad y un precio válidos.');
              return;
            }
            cambiar((d) =>
              registrarCompra(
                d,
                {
                  articuloId: articulo.id,
                  cantidad: cant,
                  precioTotal: total,
                  fecha: new Date(v.fecha || Date.now()).toISOString(),
                  tienda: v.tienda?.trim() || undefined,
                  descripcion: v.descripcion?.trim() || undefined,
                },
                nuevoId,
              ),
            );
            redibujar();
          },
        ),
      ),
      plegable(
        '🍳 Registrar consumo',
        formulario(
          [
            { nombre: 'cantidad', etiqueta: `Cantidad (${unidad})`, tipo: 'number', paso: 'any', requerido: true, valor: '1' },
            { nombre: 'fecha', etiqueta: 'Fecha', tipo: 'datetime-local', valor: fechaParaInput(), requerido: true },
            { nombre: 'descripcion', etiqueta: 'Descripción (opcional)' },
          ],
          'Registrar consumo',
          (v) => {
            const cant = Number(v.cantidad);
            const stock = calcularStock(leer().movimientos.filter((m) => m.articuloId === articulo.id));
            if (!(cant > 0)) return;
            if (cant > stock) {
              alert(`No hay suficiente stock: hay ${cantidad(stock)} ${unidad}.`);
              return;
            }
            cambiar((d) =>
              d.movimientos.push({
                id: nuevoId(),
                articuloId: articulo.id,
                tipo: 'consumo',
                cantidad: cant,
                fecha: new Date(v.fecha || Date.now()).toISOString(),
                descripcion: v.descripcion?.trim() || undefined,
                activo: true,
              }),
            );
            redibujar();
          },
        ),
      ),
      plegable(
        e.enLista ? '📝 Ya está en una lista: agregar más' : '📝 Agregar a una lista de compras',
        formulario(
          [
            { nombre: 'lista', etiqueta: 'Lista', opciones: opcionesDeListas(), valor: datos.listas[0]?.id ?? 'nueva' },
            { nombre: 'cantidad', etiqueta: 'Cantidad', tipo: 'number', paso: 'any', valor: '1', requerido: true },
            { nombre: 'precio', etiqueta: 'Precio estimado (opcional)', tipo: 'number', valor: e.precioPromedio ? String(e.precioPromedio) : '' },
          ],
          'Agregar',
          (v) => {
            let listaId = '';
            cambiar((d) => {
              listaId = resolverLista(d, v.lista ?? 'nueva', 'Compras');
              agregarArticulosALista(d, listaId, [{ articuloId: articulo.id, cantidad: Number(v.cantidad) || 1, precioEstimado: Number(v.precio) || undefined }], nuevoId);
            });
            navegar('lista', { id: listaId });
          },
        ),
      ),
    );

    // ---- Historial de precios ----
    const series = seriesDelProducto(datos.historial, articulo.nombre);
    contenedor.append(el('h2', {}, 'Historial de precios'));
    if (!series.length) {
      contenedor.append(vacio('Todavía no hay precios: aparecen al registrar compras y al buscar este producto en los supermercados.'));
    } else {
      const hoy = dia();
      contenedor.append(
        el(
          'ul',
          { class: 'filas' },
          ...series.map((s) => {
            const ultimo = s.puntos.at(-1)!;
            const analisis = analizarPrecio(s.puntos, ultimo.precio, ultimo.dia === hoy ? hoy : '9999-12-31');
            return el(
              'li',
              {},
              el(
                'span',
                {},
                el('strong', {}, precio(ultimo.precio, s.moneda)),
                ` ${s.titulo}`,
                el('small', {}, ` · ${s.tienda} · ${fechaCorta(ultimo.dia)}`),
                analisis.promedio
                  ? el('small', { class: 'bloque' }, `Promedio ${precio(Math.round(analisis.promedio), s.moneda)} · mín ${precio(analisis.minimo!, s.moneda)} · máx ${precio(analisis.maximo!, s.moneda)} · ${s.puntos.length} días`)
                  : null,
              ),
              el('span', { class: 'acciones' }, minigrafico(s.puntos.map((p) => p.precio)), ultimo.dia === hoy ? insignia(TEXTO_VEREDICTO[analisis.veredicto], analisis.veredicto) : null),
            );
          }),
        ),
      );
    }

    // ---- Movimientos ----
    contenedor.append(
      el('h2', {}, 'Movimientos'),
      movimientos.length ? el('ul', { class: 'filas movimientos' }, ...movimientos.map((m) => filaMovimiento(m, unidad))) : vacio('Aún no hay movimientos.'),
    );

    // ---- Editar ----
    contenedor.append(
      plegable(
        'Editar producto',
        formularioArticulo(articulo, 'Guardar', (campos) => {
          cambiar((d) => {
            const x = d.articulos.find((y) => y.id === articulo.id);
            if (x) Object.assign(x, campos);
            for (const l of d.listas) for (const p of l.productos) if (p.articuloId === articulo.id) p.nombre = campos.nombre;
          });
          redibujar();
        }),
        boton('Eliminar producto', () => {
          if (!confirm(`¿Eliminar "${articulo.nombre}" con sus movimientos?`)) return;
          cambiar((d) => {
            d.articulos = d.articulos.filter((a) => a.id !== articulo.id);
            d.movimientos = d.movimientos.filter((m) => m.articuloId !== articulo.id);
            d.mercados.forEach((m) => (m.articuloIds = m.articuloIds.filter((id) => id !== articulo.id)));
            d.comidas.forEach((c) => (c.lineas = c.lineas.filter((l) => l.articuloId !== articulo.id)));
            for (const l of d.listas) for (const p of l.productos) if (p.articuloId === articulo.id) delete p.articuloId;
          });
          navegar('despensa', { id: articulo.despensaId });
        }, 'peligro'),
      ),
    );
  },
};
