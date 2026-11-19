// Una tienda: su enlace si vende online y, para las manuales, los precios
// que carga el usuario (mantenerlos al día es cosa suya).

import { claveManual } from '../logica/comparar.ts';
import { anotarPrecio } from '../logica/historial.ts';
import { cambiar, leer } from '../datos/almacen.ts';
import { redibujar, type Pantalla } from '../router.ts';
import { boton, el, formulario, precio, vacio } from '../ui/dom.ts';

const MONEDA_MANUAL = '$';

export const pantallaTienda: Pantalla = {
  titulo: (params) => leer().tiendas.find((t) => t.id === params.get('id'))?.nombre ?? 'Tienda',
  volverA: (params) => `sitio?id=${leer().tiendas.find((t) => t.id === params.get('id'))?.sitioId ?? ''}`,
  render(contenedor, params) {
    const tienda = leer().tiendas.find((t) => t.id === params.get('id'));
    if (!tienda) {
      contenedor.append(vacio('Esta tienda ya no existe.'));
      return;
    }

    if (tienda.direccion) contenedor.append(el('p', { class: 'ayuda' }, tienda.direccion));
    if (tienda.online) {
      contenedor.append(el('p', {}, 'Vende online: ', el('a', { href: tienda.online.url, target: '_blank', rel: 'noopener' }, tienda.online.url)));
    } else if (tienda.origen === 'mapeada') {
      contenedor.append(el('p', { class: 'ayuda' }, 'No encontramos su tienda online. Puedes cargar sus precios a mano.'));
    }

    const manuales = leer().ofertas.filter((o) => o.tiendaId === tienda.id && o.origen === 'manual');
    contenedor.append(
      el('h2', {}, 'Precios cargados a mano'),
      manuales.length
        ? el(
            'ul',
            { class: 'filas' },
            ...manuales.map((o) =>
              el(
                'li',
                {},
                el('span', {}, o.titulo, el('small', {}, ` ${precio(o.precio, o.moneda)} · ${new Date(o.actualizada).toLocaleDateString()}`)),
                boton('Quitar', () => {
                  cambiar((d) => {
                    d.ofertas = d.ofertas.filter((y) => !(y.tiendaId === o.tiendaId && y.productoId === o.productoId && y.titulo === o.titulo));
                  });
                  redibujar();
                }, 'secundario'),
              ),
            ),
          )
        : vacio('Sin precios todavía.'),
      formulario(
        [
          { nombre: 'nombre', etiqueta: 'Producto, como en tu lista', requerido: true },
          { nombre: 'marca', etiqueta: 'Marca (opcional)' },
          { nombre: 'precio', etiqueta: 'Precio', tipo: 'number', requerido: true },
        ],
        'Guardar precio',
        ({ nombre = '', marca = '', precio: valor = '' }) => {
          const productoId = claveManual(nombre);
          const titulo = marca ? `${nombre} ${marca}` : nombre;
          cambiar((d) => {
            d.ofertas = d.ofertas.filter((o) => !(o.tiendaId === tienda.id && o.productoId === productoId && o.titulo === titulo));
            d.ofertas.push({
              tiendaId: tienda.id,
              productoId,
              titulo,
              marca: marca || undefined,
              precio: Number(valor),
              moneda: MONEDA_MANUAL,
              origen: 'manual',
              actualizada: new Date().toISOString(),
            });
            anotarPrecio(d.historial, {
              producto: nombre,
              titulo,
              tienda: tienda.nombre,
              tiendaId: tienda.id,
              precio: Number(valor),
              moneda: MONEDA_MANUAL,
              origen: 'manual',
            });
          });
          redibujar();
        },
      ),
    );
  },
};
