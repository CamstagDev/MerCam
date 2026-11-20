// Una lista de compras: sus productos (con marca opcional, o sacados de la
// despensa), el botón para buscar sus precios en un sitio y "marcar como
// comprado", que suma a la despensa lo que venía de ella y anota el
// precio en el historial.

import type { Lista } from '../../compartido/tipos.ts';
import { cambiar, leer, nuevoId } from '../datos/almacen.ts';
import { agregarArticulosALista, estadoArticulo, marcarComprados } from '../logica/despensa.ts';
import { navegar, redibujar, type Pantalla } from '../router.ts';
import { boton, cantidad, casilla, el, formulario, insignia, pesos, plegable, vacio } from '../ui/dom.ts';
import { camposDeContenido as camposContenido, leerContenido } from './comunes.ts';

/** Productos marcados, por lista; sobreviven a los redibujos. */
const seleccion = new Map<string, Set<string>>();

/** Lo que va a costar cada producto: la oferta elegida o el precio estimado. */
function totalDe(lista: Lista): { total: number; sinPrecio: number } {
  const { elecciones } = leer();
  let total = 0;
  let sinPrecio = 0;
  for (const p of lista.productos) {
    const eleccion = elecciones.find((e) => e.listaId === lista.id && e.productoId === p.id);
    const valor = eleccion ? eleccion.oferta.precio * p.cantidad : p.precioEstimado;
    if (valor) total += valor;
    else sinPrecio++;
  }
  return { total, sinPrecio };
}

export const pantallaLista: Pantalla = {
  titulo: (params) => leer().listas.find((l) => l.id === params.get('id'))?.nombre ?? 'Lista',
  volverA: 'inicio',
  render(contenedor, params) {
    const datos = leer();
    const lista = datos.listas.find((l) => l.id === params.get('id'));
    if (!lista) {
      contenedor.append(vacio('Esta lista ya no existe.'));
      return;
    }
    if (!seleccion.has(lista.id)) seleccion.set(lista.id, new Set());
    const marcados = seleccion.get(lista.id)!;
    for (const id of marcados) if (!lista.productos.some((p) => p.id === id)) marcados.delete(id);
    const cambiarProducto = (id: string, cambio: (p: Lista['productos'][number]) => void) => {
      cambiar((d) => {
        const p = d.listas.find((x) => x.id === lista.id)?.productos.find((x) => x.id === id);
        if (p) cambio(p);
      });
      redibujar();
    };

    contenedor.append(
      lista.productos.length
        ? el(
            'ul',
            { class: 'filas' },
            ...lista.productos.map((p) => {
              const eleccion = datos.elecciones.find((e) => e.listaId === lista.id && e.productoId === p.id);
              const tienda = eleccion && datos.tiendas.find((t) => t.id === eleccion.oferta.tiendaId);
              const unidad = p.articuloId
                ? datos.unidades.find((u) => u.id === datos.articulos.find((a) => a.id === p.articuloId)?.unidadId)?.nombre
                : undefined;
              const stock = p.articuloId ? estadoArticulo(datos, p.articuloId).stock : undefined;
              return el(
                'li',
                {},
                casilla(marcados.has(p.id), (m) => {
                  if (m) marcados.add(p.id);
                  else marcados.delete(p.id);
                  redibujar();
                }, `Seleccionar ${p.nombre}`),
                el(
                  'div',
                  { class: 'crece' },
                  el(
                    'span',
                    {},
                    `${cantidad(p.cantidad)}${unidad ? ` ${unidad}` : ''} × `,
                    p.articuloId ? el('a', { href: `#/articulo?id=${p.articuloId}` }, p.nombre) : p.nombre,
                    p.marca ? el('small', {}, ` ${p.marca}`) : null,
                    p.contenido ? el('small', {}, ` · ${cantidad(p.contenido)} ${datos.unidades.find((u) => u.id === p.contenidoUnidadId)?.nombre ?? ''}`) : null,
                    p.articuloId ? insignia('Despensa', '', `En casa: ${cantidad(stock ?? 0)}`) : null,
                  ),
                  el(
                    'small',
                    { class: 'bloque' },
                    eleccion
                      ? `${tienda?.nombre ?? '?'} · ${pesos(eleccion.oferta.precio * p.cantidad)}`
                      : p.precioEstimado
                        ? `~${pesos(p.precioEstimado)} estimado`
                        : 'Sin precio',
                  ),
                  plegable(
                    'Editar',
                    formulario(
                      [
                        { nombre: 'cantidad', etiqueta: 'Cantidad', tipo: 'number', paso: 'any', valor: String(p.cantidad), requerido: true },
                        { nombre: 'marca', etiqueta: 'Marca (opcional)', valor: p.marca ?? '' },
                        ...camposContenido(p.contenido, p.contenidoUnidadId),
                        { nombre: 'precio', etiqueta: 'Precio estimado total (opcional)', tipo: 'number', valor: p.precioEstimado ? String(p.precioEstimado) : '' },
                      ],
                      'Guardar',
                      (v) =>
                        cambiarProducto(p.id, (x) => {
                          x.cantidad = Number(v.cantidad) || x.cantidad;
                          x.marca = v.marca?.trim() || undefined;
                          x.precioEstimado = Number(v.precio) || undefined;
                          Object.assign(x, leerContenido(v.contenido, v.contenidoUnidadId));
                        }),
                      { limpiar: false },
                    ),
                  ),
                ),
                boton('Quitar', () => {
                  cambiar((d) => {
                    const l = d.listas.find((x) => x.id === lista.id);
                    if (l) l.productos = l.productos.filter((x) => x.id !== p.id);
                    d.elecciones = d.elecciones.filter((e) => !(e.listaId === lista.id && e.productoId === p.id));
                  });
                  redibujar();
                }, 'secundario'),
              );
            }),
          )
        : vacio('La lista está vacía.'),
    );

    if (lista.productos.length) {
      const { total, sinPrecio } = totalDe(lista);
      contenedor.append(el('p', { class: 'ayuda' }, `Total aproximado: ${pesos(total)}${sinPrecio ? ` (${sinPrecio} sin precio)` : ''}`));
      contenedor.append(
        el(
          'p',
          { class: 'formulario' },
          boton(
            marcados.size === lista.productos.length ? 'Quitar selección' : 'Seleccionar todo',
            () => {
              if (marcados.size === lista.productos.length) marcados.clear();
              else lista.productos.forEach((p) => marcados.add(p.id));
              redibujar();
            },
            'secundario',
          ),
          marcados.size
            ? boton(`✓ Marcar ${marcados.size} como comprados`, () => {
                let resultado: ReturnType<typeof marcarComprados> = { comprados: [], errores: [] };
                cambiar((d) => (resultado = marcarComprados(d, lista.id, [...marcados], nuevoId)));
                marcados.clear();
                if (resultado.errores.length) alert(`No se marcaron:\n${resultado.errores.map((e) => `• ${e.motivo}`).join('\n')}`);
                redibujar();
              })
            : null,
        ),
        el('p', { class: 'ayuda' }, 'Al marcar como comprado, lo que viene de la despensa suma stock con su precio y tienda, y el precio queda en el historial.'),
      );
    }

    contenedor.append(
      formulario(
        [
          { nombre: 'nombre', etiqueta: 'Producto (p. ej. Leche entera 1 L)', requerido: true },
          { nombre: 'marca', etiqueta: 'Marca (opcional)' },
          { nombre: 'cantidad', etiqueta: 'Cant.', tipo: 'number', paso: 'any' },
          ...camposContenido(),
        ],
        'Agregar',
        ({ nombre = '', marca = '', cantidad: cant = '', contenido, contenidoUnidadId }) => {
          cambiar((d) => {
            const producto = { id: nuevoId(), nombre: nombre.trim(), marca: marca.trim() || undefined, cantidad: Number(cant) || 1 };
            const extra = leerContenido(contenido, contenidoUnidadId);
            d.listas.find((x) => x.id === lista.id)?.productos.push(extra.contenido ? { ...producto, ...extra } : producto);
          });
          redibujar();
        },
      ),
    );

    // ---- Desde la despensa ----
    if (datos.articulos.length) {
      const nombreDespensa = (id: string) => datos.despensas.find((d) => d.id === id)?.nombre ?? '';
      const variasDespensas = datos.despensas.length > 1;
      contenedor.append(
        plegable(
          '+ Desde la despensa',
          formulario(
            [
              {
                nombre: 'articulo',
                etiqueta: 'Producto de la despensa',
                opciones: [...datos.articulos]
                  .sort((a, b) => a.nombre.localeCompare(b.nombre))
                  .map((a) => ({ valor: a.id, texto: variasDespensas ? `${a.nombre} (${nombreDespensa(a.despensaId)})` : a.nombre })),
                requerido: true,
              },
              { nombre: 'cantidad', etiqueta: 'Cant.', tipo: 'number', paso: 'any', valor: '1' },
            ],
            'Agregar',
            ({ articulo = '', cantidad: cant = '' }) => {
              cambiar((d) => {
                const promedio = estadoArticulo(d, articulo).precioPromedio;
                const c = Number(cant) || 1;
                agregarArticulosALista(d, lista.id, [{ articuloId: articulo, cantidad: c, precioEstimado: promedio ? Math.ceil(promedio * c) : undefined }], nuevoId);
              });
              redibujar();
            },
          ),
          datos.mercados.length
            ? formulario(
                [{ nombre: 'mercado', etiqueta: 'Mercado guardado', opciones: datos.mercados.map((m) => ({ valor: m.id, texto: `${m.nombre} (${m.articuloIds.length})` })) }],
                'Agregar mercado',
                ({ mercado = '' }) => {
                  cambiar((d) => {
                    const m = d.mercados.find((x) => x.id === mercado);
                    if (!m) return;
                    agregarArticulosALista(
                      d,
                      lista.id,
                      m.articuloIds.map((articuloId) => ({ articuloId, cantidad: 1, precioEstimado: estadoArticulo(d, articuloId).precioPromedio })),
                      nuevoId,
                    );
                  });
                  redibujar();
                },
              )
            : null,
        ),
      );
    }

    const { sitios } = datos;
    contenedor.append(el('h2', {}, 'Buscar precios en'));
    if (!sitios.length) {
      contenedor.append(vacio('Primero crea un sitio en el inicio.'));
    } else {
      contenedor.append(
        el('div', { class: 'grilla' }, ...sitios.map((s) => boton(s.nombre, () => navegar('comparar', { lista: lista.id, sitio: s.id })))),
        el('p', {}, el('a', { href: `#/minilista?lista=${lista.id}` }, 'Ver dónde compro cada cosa →')),
      );
    }

    contenedor.append(
      plegable(
        'Editar lista',
        formulario([{ nombre: 'nombre', etiqueta: 'Nombre', valor: lista.nombre, requerido: true }], 'Guardar', ({ nombre = '' }) => {
          cambiar((d) => {
            const l = d.listas.find((x) => x.id === lista.id);
            if (l) l.nombre = nombre.trim();
          });
          redibujar();
        }, { limpiar: false }),
        boton('Eliminar lista', () => {
          if (!confirm(`¿Eliminar la lista "${lista.nombre}"?`)) return;
          cambiar((d) => {
            d.listas = d.listas.filter((l) => l.id !== lista.id);
            d.elecciones = d.elecciones.filter((e) => e.listaId !== lista.id);
          });
          navegar('inicio');
        }, 'peligro'),
      ),
    );
  },
};
