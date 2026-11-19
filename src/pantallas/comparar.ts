// Comparar: busca los productos de una lista en las tiendas de un sitio.
// Cada vez que se entra se vuelven a pedir los precios online (los
// descuentos cambian de un día a otro). Por producto se ven las 3 más
// baratas (primero las de la marca pedida) y "Ver más" muestra todas.
// Cada precio se anota en el historial y se compara con lo que costaba
// otros días en esa tienda: así se ve si la "oferta" es de verdad.

import type { Eleccion, Oferta, Producto } from '../../compartido/tipos.ts';
import { cambiar, guardarOfertasOnline, leer } from '../datos/almacen.ts';
import { TEXTO_VEREDICTO, analizarOferta, anotarPrecio } from '../logica/historial.ts';
import { buscar } from '../datos/servidor.ts';
import { OFERTAS_VISIBLES, esDeLaMarca, ofertasVisibles, ordenarOfertas } from '../logica/comparar.ts';
import type { Pantalla } from '../router.ts';
import { boton, el, insignia, precio, vacio } from '../ui/dom.ts';

/** Insignias de una oferta: descuento que muestra la tienda y comparación con el historial. */
function insignias(oferta: Oferta): HTMLElement[] {
  const resultado: HTMLElement[] = [];
  if (oferta.precioLista && oferta.precioLista > oferta.precio) {
    resultado.push(insignia(`-${Math.round((1 - oferta.precio / oferta.precioLista) * 100)} %`, 'oferta', 'Descuento que muestra la tienda'));
  }
  const analisis = analizarOferta(leer().historial, oferta.tiendaId, oferta.titulo, oferta.precio);
  if (analisis.veredicto !== 'nuevo' && analisis.veredicto !== 'normal') {
    const detalle = `Promedio de ${analisis.dias} días: ${precio(Math.round(analisis.promedio!), oferta.moneda)} · mínimo ${precio(analisis.minimo!, oferta.moneda)}`;
    const variacion = Math.round(analisis.variacion! * 100);
    resultado.push(insignia(`${TEXTO_VEREDICTO[analisis.veredicto]} (${variacion > 0 ? '+' : ''}${variacion} %)`, analisis.veredicto, detalle));
  }
  return resultado;
}

export const pantallaComparar: Pantalla = {
  titulo: 'Comparar precios',
  volverA: (params) => `lista?id=${params.get('lista') ?? ''}`,
  render(contenedor, params) {
    const lista = leer().listas.find((l) => l.id === params.get('lista'));
    const sitio = leer().sitios.find((s) => s.id === params.get('sitio'));
    if (!lista || !sitio) {
      contenedor.append(vacio('No se encontró la lista o el sitio.'));
      return;
    }
    const tiendas = leer().tiendas.filter((t) => t.sitioId === sitio.id);
    const online = tiendas.filter((t) => t.online);
    const verTodas = new Set<string>();
    const estado = el('p', { class: 'ayuda' });
    const resultados = el('div');
    contenedor.append(estado, resultados, el('p', {}, el('a', { href: `#/minilista?lista=${lista.id}`, class: 'boton' }, 'Ver dónde compro cada cosa')));

    const elegida = (producto: Producto) => leer().elecciones.find((e) => e.listaId === lista.id && e.productoId === producto.id);

    function elegir(producto: Producto, oferta: Oferta) {
      cambiar((d) => {
        d.elecciones = d.elecciones.filter((e) => !(e.listaId === lista!.id && e.productoId === producto.id));
        const eleccion: Eleccion = { listaId: lista!.id, productoId: producto.id, oferta };
        d.elecciones.push(eleccion);
      });
      dibujar();
    }

    function dibujar() {
      const ids = new Set(tiendas.map((t) => t.id));
      const ofertas = leer().ofertas.filter((o) => ids.has(o.tiendaId));
      resultados.replaceChildren(
        ...lista!.productos.map((producto) => {
          const ordenadas = ordenarOfertas(producto, ofertas);
          const actual = elegida(producto)?.oferta;
          const bloque = el('section', { class: 'producto' }, el('h3', {}, producto.nombre, producto.marca ? el('small', {}, ` ${producto.marca}`) : null));
          if (!ordenadas.length) bloque.append(vacio('Sin precios en este sitio.'));
          for (const oferta of ofertasVisibles(ordenadas, verTodas.has(producto.id))) {
            const tienda = tiendas.find((t) => t.id === oferta.tiendaId);
            const esLaElegida = actual?.tiendaId === oferta.tiendaId && actual.titulo === oferta.titulo;
            bloque.append(
              el(
                'div',
                { class: `oferta${esLaElegida ? ' elegida' : ''}${producto.marca && esDeLaMarca(oferta, producto.marca) ? ' de-la-marca' : ''}` },
                el(
                  'span',
                  {},
                  el('strong', {}, precio(oferta.precio, oferta.moneda)),
                  oferta.precioLista ? el('s', {}, ` ${precio(oferta.precioLista, oferta.moneda)}`) : null,
                  ` ${oferta.titulo}`,
                  el('small', {}, ` · ${tienda?.nombre ?? '?'}`),
                  ...insignias(oferta),
                ),
                boton(esLaElegida ? 'Elegida' : 'Elegir', () => elegir(producto, oferta), esLaElegida ? '' : 'secundario'),
              ),
            );
          }
          if (ordenadas.length > OFERTAS_VISIBLES && !verTodas.has(producto.id)) {
            bloque.append(boton(`Ver más (${ordenadas.length})`, () => { verTodas.add(producto.id); dibujar(); }, 'enlace'));
          }
          return bloque;
        }),
      );
    }

    dibujar();
    if (!online.length || !lista.productos.length) {
      estado.textContent = online.length ? '' : 'Ninguna tienda de este sitio vende online: solo se ven los precios cargados a mano.';
      return;
    }
    estado.textContent = `Buscando precios de hoy en ${online.length} tiendas…`;
    buscar({
      tiendas: online.map(({ id, nombre, online: o }) => ({ id, nombre, online: o })),
      productos: lista.productos.map(({ id, nombre, marca }) => ({ id, nombre, marca })),
    })
      .then(({ ofertas, errores }) => {
        guardarOfertasOnline(online.map((t) => t.id), lista.productos.map((p) => p.id), ofertas);
        cambiar((d) => {
          for (const o of ofertas) {
            anotarPrecio(d.historial, {
              producto: lista.productos.find((p) => p.id === o.productoId)?.nombre ?? o.titulo,
              titulo: o.titulo,
              tienda: tiendas.find((t) => t.id === o.tiendaId)?.nombre ?? '?',
              tiendaId: o.tiendaId,
              precio: o.precio,
              precioLista: o.precioLista,
              moneda: o.moneda,
              origen: 'online',
              fecha: o.actualizada,
            });
          }
        });
        estado.textContent = errores.length
          ? `Precios actualizados. Fallaron: ${errores.map((e) => tiendas.find((t) => t.id === e.tiendaId)?.nombre).join(', ')}.`
          : 'Precios actualizados.';
        dibujar();
      })
      .catch((error: unknown) => {
        estado.textContent = `No se pudo actualizar (${error instanceof Error ? error.message : error}). Se muestran los últimos precios conocidos.`;
      });
  },
};
