// Planes de comidas (los "planificadores" y "usos" de Cambasket).
//
// Un plan tiene comidas; cada comida usa artículos de la despensa. Mientras
// una comida está pendiente, lo que pide queda "separado" del stock; al
// ejecutarla se descuenta de verdad (y se puede deshacer). Lo que falta
// para cumplir el plan se pasa a una lista de compras con un toque, y desde
// ahí se buscan los precios en los supermercados cercanos.

import type { Comida, Plan } from '../../compartido/tipos.ts';
import { cambiar, leer, nuevoId, type Datos } from '../datos/almacen.ts';
import { agregarArticulosALista, deshacerComida, ejecutarComida, estadoArticulo, faltantesDePlan } from '../logica/despensa.ts';
import { navegar, redibujar, type Pantalla } from '../router.ts';
import { boton, cantidad, el, enlace, fechaCorta, formulario, insignia, pesos, plegable, vacio } from '../ui/dom.ts';

const nombreLista = (plan: Plan) => `Plan · ${plan.nombre}`;

/**
 * Pasa lo que falta del plan a su lista ("Plan · <nombre>"). Si la lista
 * ya existía, se rehace la parte de este plan (no se duplica).
 */
export function armarListaDePlan(d: Datos, planId: string): string | null {
  const plan = d.planes.find((p) => p.id === planId);
  if (!plan) return null;
  const faltantes = faltantesDePlan(d, planId);
  let lista = d.listas.find((l) => l.nombre === nombreLista(plan));
  if (!lista) {
    lista = { id: nuevoId(), nombre: nombreLista(plan), productos: [], creada: new Date().toISOString() };
    d.listas.push(lista);
  }
  const delPlan = new Set(d.comidas.filter((c) => c.planId === planId).flatMap((c) => c.lineas.map((l) => l.articuloId)));
  const quitados = new Set(lista.productos.filter((p) => p.articuloId && delPlan.has(p.articuloId)).map((p) => p.id));
  lista.productos = lista.productos.filter((p) => !quitados.has(p.id));
  d.elecciones = d.elecciones.filter((e) => !(e.listaId === lista.id && quitados.has(e.productoId)));
  agregarArticulosALista(
    d,
    lista.id,
    faltantes.map((f) => {
      const promedio = estadoArticulo(d, f.articuloId).precioPromedio;
      return { ...f, precioEstimado: promedio ? Math.ceil(promedio * f.cantidad) : undefined };
    }),
    nuevoId,
  );
  return lista.id;
}

export const pantallaPlanes: Pantalla = {
  titulo: 'Planes de comidas',
  volverA: (params) => `despensa?id=${params.get('despensa') ?? ''}`,
  render(contenedor, params) {
    const datos = leer();
    const despensa = datos.despensas.find((d) => d.id === params.get('despensa'));
    if (!despensa) {
      contenedor.append(vacio('Esta despensa ya no existe.'));
      return;
    }
    const planes = datos.planes.filter((p) => p.despensaId === despensa.id).sort((a, b) => b.creado.localeCompare(a.creado));
    contenedor.append(
      el('p', { class: 'ayuda' }, `Despensa: ${despensa.nombre}. Planea comidas con sus productos; lo que falte lo pasas a una lista y comparas precios en los supermercados cercanos.`),
      planes.length
        ? el(
            'div',
            { class: 'grilla' },
            ...planes.map((p) => {
              const comidas = datos.comidas.filter((c) => c.planId === p.id);
              const pendientes = comidas.filter((c) => !c.ejecutada).length;
              return enlace(`${p.nombre} · ${comidas.length} comidas${pendientes ? ` (${pendientes} pendientes)` : ''}`, `plan?id=${p.id}`);
            }),
          )
        : vacio('Todavía no hay planes.'),
      formulario([{ nombre: 'nombre', etiqueta: 'Nuevo plan (p. ej. Semana 47)', requerido: true }], 'Crear plan', ({ nombre = '' }) => {
        const id = nuevoId();
        cambiar((d) => d.planes.push({ id, despensaId: despensa.id, nombre: nombre.trim(), creado: new Date().toISOString() }));
        navegar('plan', { id });
      }),
    );
  },
};

function filaComida(c: Comida): HTMLElement {
  return el(
    'a',
    { href: `#/comida?id=${c.id}`, class: `tarjeta comida${c.ejecutada ? ' hecha' : ''}` },
    el('strong', {}, c.nombre),
    el('small', { class: 'bloque' }, [c.fecha ? fechaCorta(c.fecha) : 'Sin fecha', `${c.lineas.length} productos`].join(' · ')),
    c.ejecutada ? insignia('Ejecutada', 'positivo') : insignia('Pendiente'),
  );
}

export const pantallaPlan: Pantalla = {
  titulo: (params) => leer().planes.find((p) => p.id === params.get('id'))?.nombre ?? 'Plan',
  volverA: (params) => `planes?despensa=${leer().planes.find((p) => p.id === params.get('id'))?.despensaId ?? ''}`,
  render(contenedor, params) {
    const datos = leer();
    const plan = datos.planes.find((p) => p.id === params.get('id'));
    if (!plan) {
      contenedor.append(vacio('Este plan ya no existe.'));
      return;
    }
    const comidas = datos.comidas
      .filter((c) => c.planId === plan.id)
      .sort((a, b) => (a.fecha ?? '9999').localeCompare(b.fecha ?? '9999') || a.creada.localeCompare(b.creada));

    contenedor.append(
      el('h2', {}, 'Comidas'),
      comidas.length ? el('div', { class: 'grilla' }, ...comidas.map(filaComida)) : vacio('Todavía no hay comidas en este plan.'),
      formulario(
        [
          { nombre: 'nombre', etiqueta: 'Nueva comida (p. ej. Almuerzo lunes)', requerido: true },
          { nombre: 'fecha', etiqueta: 'Día', tipo: 'date' },
        ],
        'Agregar comida',
        ({ nombre = '', fecha = '' }) => {
          const id = nuevoId();
          cambiar((d) => d.comidas.push({ id, planId: plan.id, nombre: nombre.trim(), fecha: fecha || undefined, lineas: [], creada: new Date().toISOString() }));
          navegar('comida', { id });
        },
      ),
    );

    // ---- Lo que falta comprar ----
    const faltantes = faltantesDePlan(datos, plan.id);
    contenedor.append(el('h2', {}, 'Lo que falta comprar'));
    if (!faltantes.length) {
      contenedor.append(vacio(comidas.some((c) => !c.ejecutada) ? 'Con lo que hay en la despensa alcanza para este plan. 🎉' : 'No hay comidas pendientes.'));
    } else {
      let total = 0;
      let sinPrecio = 0;
      contenedor.append(
        el(
          'ul',
          { class: 'filas' },
          ...faltantes.map((f) => {
            const articulo = datos.articulos.find((a) => a.id === f.articuloId);
            const unidad = datos.unidades.find((u) => u.id === articulo?.unidadId)?.nombre ?? '';
            const promedio = estadoArticulo(datos, f.articuloId).precioPromedio;
            if (promedio) total += promedio * f.cantidad;
            else sinPrecio++;
            return el(
              'li',
              {},
              el('a', { href: `#/articulo?id=${f.articuloId}` }, `${cantidad(f.cantidad)} ${unidad} × ${articulo?.nombre ?? '?'}`),
              el('small', {}, promedio ? `~${pesos(promedio * f.cantidad)}` : 'sin precio'),
            );
          }),
        ),
        el('p', { class: 'ayuda' }, `Total aproximado (con el precio promedio de tus compras): ${pesos(total)}${sinPrecio ? ` · ${sinPrecio} sin precio` : ''}`),
        boton('🛒 Pasar a una lista y comparar precios', () => {
          let listaId: string | null = null;
          cambiar((d) => (listaId = armarListaDePlan(d, plan.id)));
          if (listaId) navegar('lista', { id: listaId });
        }),
      );
    }

    contenedor.append(
      plegable(
        'Editar plan',
        formulario([{ nombre: 'nombre', etiqueta: 'Nombre', valor: plan.nombre, requerido: true }], 'Guardar', ({ nombre = '' }) => {
          cambiar((d) => {
            const x = d.planes.find((p) => p.id === plan.id);
            if (x) x.nombre = nombre.trim();
          });
          redibujar();
        }, { limpiar: false }),
        boton('Eliminar plan', () => {
          if (comidas.some((c) => c.ejecutada) && !confirm('Este plan tiene comidas ejecutadas: sus consumos se quedan en la despensa. ¿Eliminarlo igual?')) return;
          if (!confirm(`¿Eliminar el plan "${plan.nombre}"?`)) return;
          cambiar((d) => {
            d.planes = d.planes.filter((p) => p.id !== plan.id);
            d.comidas = d.comidas.filter((c) => c.planId !== plan.id);
          });
          navegar('planes', { despensa: plan.despensaId });
        }, 'peligro'),
      ),
    );
  },
};

export const pantallaComida: Pantalla = {
  titulo: (params) => leer().comidas.find((c) => c.id === params.get('id'))?.nombre ?? 'Comida',
  volverA: (params) => `plan?id=${leer().comidas.find((c) => c.id === params.get('id'))?.planId ?? ''}`,
  render(contenedor, params) {
    const datos = leer();
    const comida = datos.comidas.find((c) => c.id === params.get('id'));
    const plan = datos.planes.find((p) => p.id === comida?.planId);
    if (!comida || !plan) {
      contenedor.append(vacio('Esta comida ya no existe.'));
      return;
    }
    const hecha = Boolean(comida.ejecutada);
    const articulos = datos.articulos.filter((a) => a.despensaId === plan.despensaId).sort((a, b) => a.nombre.localeCompare(b.nombre));
    const unidadDe = (articuloId: string) => datos.unidades.find((u) => u.id === datos.articulos.find((a) => a.id === articuloId)?.unidadId)?.nombre ?? '';
    const cambiarComida = (cambio: (c: Comida) => void) => {
      cambiar((d) => {
        const c = d.comidas.find((x) => x.id === comida.id);
        if (c) cambio(c);
      });
      redibujar();
    };

    contenedor.append(
      el(
        'p',
        { class: 'ayuda' },
        `Plan: ${plan.nombre} · ${comida.fecha ? fechaCorta(comida.fecha) : 'sin fecha'}`,
        hecha ? insignia(`Ejecutada ${fechaCorta(comida.ejecutada!)}`, 'positivo') : insignia('Pendiente: lo que usa queda separado'),
      ),
      el('h2', {}, 'Productos que usa'),
      comida.lineas.length
        ? el(
            'ul',
            { class: 'filas' },
            ...comida.lineas.map((l) => {
              const articulo = datos.articulos.find((a) => a.id === l.articuloId);
              const e = estadoArticulo(datos, l.articuloId);
              return el(
                'li',
                {},
                el(
                  'div',
                  { class: 'crece' },
                  el('a', { href: `#/articulo?id=${l.articuloId}` }, `${cantidad(l.cantidad)} ${unidadDe(l.articuloId)} × ${articulo?.nombre ?? '?'}`),
                  hecha ? null : el('small', { class: `bloque${e.stock < l.cantidad ? ' negativo' : ''}` }, `En stock: ${cantidad(e.stock)}`),
                  hecha
                    ? null
                    : plegable(
                        'Cambiar cantidad',
                        formulario([{ nombre: 'cantidad', etiqueta: 'Cantidad', tipo: 'number', paso: 'any', valor: String(l.cantidad), requerido: true }], 'Guardar', (v) => {
                          const nueva = Number(v.cantidad);
                          if (nueva > 0) cambiarComida((c) => (c.lineas.find((x) => x.id === l.id)!.cantidad = nueva));
                        }, { limpiar: false }),
                      ),
                ),
                hecha ? null : boton('Quitar', () => cambiarComida((c) => (c.lineas = c.lineas.filter((x) => x.id !== l.id))), 'secundario'),
              );
            }),
          )
        : vacio('Todavía no usa ningún producto.'),
    );

    if (!hecha) {
      const disponibles = articulos.filter((a) => !comida.lineas.some((l) => l.articuloId === a.id));
      contenedor.append(
        disponibles.length
          ? formulario(
              [
                { nombre: 'articulo', etiqueta: 'Producto', opciones: disponibles.map((a) => ({ valor: a.id, texto: a.nombre })), requerido: true },
                { nombre: 'cantidad', etiqueta: 'Cantidad', tipo: 'number', paso: 'any', valor: '1', requerido: true },
              ],
              'Agregar producto',
              ({ articulo = '', cantidad: cant = '' }) => {
                const valor = Number(cant);
                if (articulo && valor > 0) cambiarComida((c) => c.lineas.push({ id: nuevoId(), articuloId: articulo, cantidad: valor }));
              },
            )
          : el('p', { class: 'ayuda' }, articulos.length ? 'Ya usa todos los productos de la despensa.' : 'La despensa no tiene productos todavía.'),
      );
    }

    const acciones = el('p', { class: 'formulario' });
    if (hecha) {
      acciones.append(
        boton('↩ Deshacer ejecución', () => {
          cambiar((d) => deshacerComida(d, comida.id));
          redibujar();
        }, 'secundario'),
      );
    } else {
      acciones.append(
        boton('✓ Ejecutar (descontar del stock)', () => {
          if (!comida.lineas.length) {
            alert('Esta comida no usa ningún producto.');
            return;
          }
          let faltan: ReturnType<typeof ejecutarComida> = [];
          cambiar((d) => (faltan = ejecutarComida(d, comida.id, nuevoId)));
          if (faltan.length) {
            alert(`No hay stock suficiente:\n${faltan.map((f) => `• ${f.nombre}: hacen falta ${cantidad(f.necesario)}, hay ${cantidad(f.disponible)}`).join('\n')}`);
          }
          redibujar();
        }),
        boton('Eliminar comida', () => {
          if (!confirm(`¿Eliminar "${comida.nombre}"?`)) return;
          cambiar((d) => (d.comidas = d.comidas.filter((c) => c.id !== comida.id)));
          navegar('plan', { id: plan.id });
        }, 'peligro'),
      );
    }
    contenedor.append(
      acciones,
      plegable(
        'Editar comida',
        formulario(
          [
            { nombre: 'nombre', etiqueta: 'Nombre', valor: comida.nombre, requerido: true },
            { nombre: 'fecha', etiqueta: 'Día', tipo: 'date', valor: comida.fecha ?? '' },
          ],
          'Guardar',
          ({ nombre = '', fecha = '' }) => cambiarComida((c) => Object.assign(c, { nombre: nombre.trim(), fecha: fecha || undefined })),
          { limpiar: false },
        ),
      ),
    );
  },
};
