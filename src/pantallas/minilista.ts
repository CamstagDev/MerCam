// Minilista: qué comprar en cada tienda, con el total por tienda y el
// enlace a la tienda online (la compra se hace en su página).

import { armarMinilista } from '../logica/comparar.ts';
import { marcarComprados } from '../logica/despensa.ts';
import { cambiar, leer, nuevoId } from '../datos/almacen.ts';
import { redibujar, type Pantalla } from '../router.ts';
import { boton, el, precio, vacio } from '../ui/dom.ts';

export const pantallaMinilista: Pantalla = {
  titulo: 'Dónde compro cada cosa',
  volverA: (params) => `lista?id=${params.get('lista') ?? ''}`,
  render(contenedor, params) {
    const lista = leer().listas.find((l) => l.id === params.get('lista'));
    if (!lista) {
      contenedor.append(vacio('Esta lista ya no existe.'));
      return;
    }
    const elecciones = leer().elecciones.filter((e) => e.listaId === lista.id);
    const grupos = armarMinilista(elecciones, lista.productos, leer().tiendas);
    if (!grupos.length) {
      contenedor.append(vacio('Todavía no elegiste dónde comprar nada. Busca precios y toca "Elegir".'));
      return;
    }
    const faltan = lista.productos.filter((p) => !elecciones.some((e) => e.productoId === p.id));
    for (const { tienda, elecciones: deLaTienda, total } of grupos) {
      const moneda = deLaTienda[0]?.oferta.moneda ?? '$';
      contenedor.append(
        el(
          'section',
          { class: 'producto' },
          el('h3', {}, tienda.nombre, el('small', {}, ` · ${precio(total, moneda)}`)),
          tienda.online ? el('p', {}, el('a', { href: tienda.online.url, target: '_blank', rel: 'noopener' }, 'Ir a la tienda online')) : null,
          boton('✓ Ya compré lo de esta tienda', () => {
            cambiar((d) => marcarComprados(d, lista.id, deLaTienda.map((e) => e.productoId), nuevoId));
            redibujar();
          }, 'secundario'),
          el(
            'ul',
            { class: 'filas' },
            ...deLaTienda.map((e) => {
              const producto = lista.productos.find((p) => p.id === e.productoId);
              const texto = `${producto?.cantidad ?? 1} × ${e.oferta.titulo} · ${precio(e.oferta.precio, e.oferta.moneda)}`;
              return el('li', {}, e.oferta.url ? el('a', { href: e.oferta.url, target: '_blank', rel: 'noopener' }, texto) : texto);
            }),
          ),
        ),
      );
    }
    if (faltan.length) contenedor.append(el('p', { class: 'ayuda' }, `Sin elegir: ${faltan.map((p) => p.nombre).join(', ')}.`));
  },
};
