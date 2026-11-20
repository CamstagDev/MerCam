// Una despensa (lo que en Cambasket era una "basket"): sus artículos con
// stock y precio promedio, agrupados por nombre general, con filtros por
// unidad, marca y categoría. Se pueden seleccionar varios para pasarlos a
// una lista de compras o guardarlos como "mercado" para reusarlos.

import type { Articulo } from '../../compartido/tipos.ts';
import { cambiar, leer, nuevoId } from '../datos/almacen.ts';
import { agregarArticulosALista, agruparPorGenerico, estadoArticulo } from '../logica/despensa.ts';
import { navegar, redibujar, type Pantalla } from '../router.ts';
import { boton, cantidad, casilla, el, enlace, formulario, insignia, pesos, plegable, vacio } from '../ui/dom.ts';
import { formularioArticulo, opcionesDeListas, resolverLista } from './comunes.ts';

/** Filtros y selección de la pantalla; sobreviven a los redibujos. */
const estado = {
  despensaId: '',
  unidad: '',
  marca: '',
  categoria: '',
  texto: '',
  seleccion: new Set<string>(),
  abiertos: new Set<string>(),
  /** El formulario de producto nuevo queda abierto para cargar varios seguidos. */
  creando: false,
};

function coincide(a: Articulo): boolean {
  if (estado.unidad && a.unidadId !== estado.unidad) return false;
  if (estado.marca && a.marcaId !== estado.marca) return false;
  if (estado.categoria && !a.categoriaIds.includes(estado.categoria)) return false;
  const texto = estado.texto.trim().toLowerCase();
  return !texto || `${a.nombre} ${a.generico}`.toLowerCase().includes(texto);
}

export function filaArticulo(a: Articulo, seleccionable = true): HTMLElement {
  const datos = leer();
  const e = estadoArticulo(datos, a.id);
  const unidad = datos.unidades.find((u) => u.id === a.unidadId)?.nombre ?? '';
  const marca = datos.marcas.find((m) => m.id === a.marcaId)?.nombre;
  const categorias = a.categoriaIds.map((id) => datos.categorias.find((c) => c.id === id)?.nombre).filter(Boolean);
  const sinStock = e.separado > 0 ? e.disponible <= 0 : e.stock <= 0;
  return el(
    'div',
    { class: `fila-articulo${sinStock ? ' sin-stock' : ''}` },
    seleccionable
      ? casilla(estado.seleccion.has(a.id), (marcada) => {
          if (marcada) estado.seleccion.add(a.id);
          else estado.seleccion.delete(a.id);
          redibujar();
        }, `Seleccionar ${a.nombre}`)
      : null,
    el(
      'a',
      { href: `#/articulo?id=${a.id}`, class: 'fila-articulo-info' },
      el('span', {}, a.nombre, e.enLista ? insignia('En lista', 'acento') : null),
      el('small', {}, [unidad, a.contenido ? `${cantidad(a.contenido)} ${datos.unidades.find((u) => u.id === a.contenidoUnidadId)?.nombre ?? ''}` : '', marca, ...categorias].filter(Boolean).join(' · ')),
    ),
    el(
      'span',
      { class: 'fila-articulo-lado' },
      el('strong', {}, e.separado > 0 ? `${cantidad(e.disponible)}/${cantidad(e.stock)}` : `${cantidad(e.stock)} ${unidad}`),
      el('small', {}, e.precioPromedio ? `~${pesos(e.precioPromedio)}` : 'Sin compras'),
    ),
  );
}

export const pantallaDespensa: Pantalla = {
  titulo: (params) => leer().despensas.find((d) => d.id === params.get('id'))?.nombre ?? 'Despensa',
  volverA: 'inicio',
  render(contenedor, params) {
    const datos = leer();
    const despensa = datos.despensas.find((d) => d.id === params.get('id'));
    if (!despensa) {
      contenedor.append(vacio('Esta despensa ya no existe.'));
      return;
    }
    if (estado.despensaId !== despensa.id) {
      Object.assign(estado, { despensaId: despensa.id, unidad: '', marca: '', categoria: '', texto: '' });
      estado.seleccion.clear();
    }
    const articulos = datos.articulos.filter((a) => a.despensaId === despensa.id);
    const visibles = articulos.filter(coincide);
    const mercados = datos.mercados.filter((m) => m.despensaId === despensa.id);

    if (despensa.descripcion) contenedor.append(el('p', { class: 'ayuda' }, despensa.descripcion));
    contenedor.append(
      el(
        'div',
        { class: 'grilla' },
        enlace(`🍽 Planes de comidas (${datos.planes.filter((p) => p.despensaId === despensa.id).length})`, `planes?despensa=${despensa.id}`),
        enlace('🏷 Marcas, unidades y categorías', 'catalogos'),
      ),
    );

    // ---- Nuevo producto ----
    const nuevo = plegable(
      '+ Nuevo producto',
      formularioArticulo(undefined, 'Crear producto', (campos) => {
        const id = nuevoId();
        cambiar((d) => d.articulos.push({ ...campos, id, despensaId: despensa.id, creado: new Date().toISOString() }));
        redibujar();
      }),
    );
    nuevo.open = estado.creando;
    nuevo.addEventListener('toggle', () => (estado.creando = nuevo.open));
    contenedor.append(nuevo);

    // ---- Filtros ----
    const filtro = (nombre: 'unidad' | 'marca' | 'categoria', todos: string, items: { id: string; nombre: string; activo: boolean }[]) => {
      const select = el('select', { 'aria-label': todos }, el('option', { value: '' }, todos), ...items.filter((i) => i.activo).map((i) => el('option', { value: i.id }, i.nombre)));
      select.value = estado[nombre];
      select.addEventListener('change', () => {
        estado[nombre] = select.value;
        redibujar();
      });
      return select;
    };
    const buscar = el('input', { type: 'search', placeholder: 'Buscar producto', 'aria-label': 'Buscar producto' });
    buscar.value = estado.texto;
    buscar.addEventListener('change', () => {
      estado.texto = buscar.value;
      redibujar();
    });
    contenedor.append(
      el('h2', {}, `Productos (${articulos.length})`),
      el(
        'div',
        { class: 'formulario' },
        buscar,
        filtro('unidad', 'Todas las unidades', datos.unidades),
        filtro('marca', 'Todas las marcas', datos.marcas),
        filtro('categoria', 'Todas las categorías', datos.categorias),
      ),
    );

    // ---- Lista agrupada por nombre general ----
    if (!visibles.length) {
      contenedor.append(vacio(articulos.length ? 'Ningún producto coincide con el filtro.' : 'Aún no hay productos en esta despensa.'));
    } else {
      const lista = el('div', { class: 'lista-articulos' });
      for (const grupo of agruparPorGenerico(visibles)) {
        if (grupo.articulos.length === 1) {
          lista.append(filaArticulo(grupo.articulos[0]!));
          continue;
        }
        const clave = grupo.generico.toLowerCase();
        const detalles = el(
          'details',
          { class: 'grupo-generico' },
          el('summary', {}, grupo.generico, insignia(`${grupo.articulos.length} variantes`)),
          ...grupo.articulos.map((a) => filaArticulo(a)),
        );
        detalles.open = estado.abiertos.has(clave);
        detalles.addEventListener('toggle', () => (detalles.open ? estado.abiertos.add(clave) : estado.abiertos.delete(clave)));
        lista.append(detalles);
      }
      contenedor.append(lista);
    }

    // ---- Acciones sobre la selección ----
    const seleccionados = [...estado.seleccion].filter((id) => articulos.some((a) => a.id === id));
    contenedor.append(
      el('h2', {}, seleccionados.length ? `${seleccionados.length} seleccionados` : 'Seleccionados'),
      seleccionados.length
        ? el(
            'div',
            {},
            formulario(
              [{ nombre: 'lista', etiqueta: 'Lista', opciones: opcionesDeListas(), valor: datos.listas[0]?.id ?? 'nueva' }],
              'Agregar a la lista',
              ({ lista = 'nueva' }) => {
                let listaId = '';
                cambiar((d) => {
                  listaId = resolverLista(d, lista, despensa.nombre);
                  agregarArticulosALista(
                    d,
                    listaId,
                    seleccionados.map((articuloId) => ({ articuloId, cantidad: 1, precioEstimado: estadoArticulo(d, articuloId).precioPromedio })),
                    nuevoId,
                  );
                });
                estado.seleccion.clear();
                navegar('lista', { id: listaId });
              },
            ),
            formulario([{ nombre: 'nombre', etiqueta: 'Nombre del mercado (p. ej. Obligatorios del mes)', requerido: true }], 'Guardar como mercado', ({ nombre = '' }) => {
              cambiar((d) => d.mercados.push({ id: nuevoId(), despensaId: despensa.id, nombre: nombre.trim(), articuloIds: seleccionados, creado: new Date().toISOString() }));
              redibujar();
            }),
            boton('Quitar selección', () => {
              estado.seleccion.clear();
              redibujar();
            }, 'secundario'),
          )
        : el('p', { class: 'ayuda' }, 'Marca productos para pasarlos a una lista de compras o guardarlos como mercado.'),
    );

    // ---- Mercados guardados ----
    contenedor.append(el('h2', {}, 'Mercados guardados'));
    contenedor.append(
      mercados.length
        ? el(
            'ul',
            { class: 'filas' },
            ...mercados.map((m) =>
              el(
                'li',
                {},
                el('span', {}, m.nombre, el('small', {}, ` · ${m.articuloIds.length} productos`)),
                el(
                  'span',
                  { class: 'acciones' },
                  boton('Seleccionar', () => {
                    estado.seleccion = new Set(m.articuloIds);
                    redibujar();
                  }, 'secundario'),
                  boton('Eliminar', () => {
                    if (!confirm(`¿Eliminar el mercado "${m.nombre}"?`)) return;
                    cambiar((d) => (d.mercados = d.mercados.filter((x) => x.id !== m.id)));
                    redibujar();
                  }, 'secundario'),
                ),
              ),
            ),
          )
        : vacio('Selecciona productos y guárdalos como mercado para reusarlos.'),
    );

    // ---- Editar la despensa ----
    contenedor.append(
      plegable(
        'Editar despensa',
        formulario(
          [
            { nombre: 'nombre', etiqueta: 'Nombre', valor: despensa.nombre, requerido: true },
            { nombre: 'descripcion', etiqueta: 'Descripción', valor: despensa.descripcion ?? '' },
          ],
          'Guardar',
          ({ nombre = '', descripcion = '' }) => {
            cambiar((d) => {
              const x = d.despensas.find((y) => y.id === despensa.id);
              if (x) Object.assign(x, { nombre: nombre.trim(), descripcion: descripcion.trim() || undefined });
            });
            redibujar();
          },
          { limpiar: false },
        ),
        boton('Eliminar despensa', () => {
          if (!confirm(`¿Eliminar "${despensa.nombre}" con todos sus productos, movimientos y planes?`)) return;
          cambiar((d) => {
            const ids = new Set(d.articulos.filter((a) => a.despensaId === despensa.id).map((a) => a.id));
            const planes = new Set(d.planes.filter((p) => p.despensaId === despensa.id).map((p) => p.id));
            d.despensas = d.despensas.filter((x) => x.id !== despensa.id);
            d.articulos = d.articulos.filter((a) => !ids.has(a.id));
            d.movimientos = d.movimientos.filter((m) => !ids.has(m.articuloId));
            d.mercados = d.mercados.filter((m) => m.despensaId !== despensa.id);
            d.planes = d.planes.filter((p) => !planes.has(p.id));
            d.comidas = d.comidas.filter((c) => !planes.has(c.planId));
            for (const l of d.listas) for (const p of l.productos) if (p.articuloId && ids.has(p.articuloId)) delete p.articuloId;
          });
          navegar('inicio');
        }, 'peligro'),
      ),
    );
  },
};
