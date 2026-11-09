// Una lista de compras: sus productos (con marca opcional) y el botón para
// buscar sus precios en un sitio.

import { cambiar, leer, nuevoId } from '../datos/almacen.ts';
import { navegar, redibujar, type Pantalla } from '../router.ts';
import { boton, el, formulario, vacio } from '../ui/dom.ts';

export const pantallaLista: Pantalla = {
  titulo: (params) => leer().listas.find((l) => l.id === params.get('id'))?.nombre ?? 'Lista',
  volverA: 'inicio',
  render(contenedor, params) {
    const lista = leer().listas.find((l) => l.id === params.get('id'));
    if (!lista) {
      contenedor.append(vacio('Esta lista ya no existe.'));
      return;
    }

    contenedor.append(
      lista.productos.length
        ? el(
            'ul',
            { class: 'filas' },
            ...lista.productos.map((p) =>
              el(
                'li',
                {},
                el('span', {}, `${p.cantidad} × ${p.nombre}`, p.marca ? el('small', {}, ` ${p.marca}`) : null),
                boton('Quitar', () => {
                  cambiar((d) => {
                    const l = d.listas.find((x) => x.id === lista.id);
                    if (l) l.productos = l.productos.filter((x) => x.id !== p.id);
                  });
                  redibujar();
                }, 'secundario'),
              ),
            ),
          )
        : vacio('La lista está vacía.'),
      formulario(
        [
          { nombre: 'nombre', etiqueta: 'Producto (p. ej. Leche entera 1 L)', requerido: true },
          { nombre: 'marca', etiqueta: 'Marca (opcional)' },
          { nombre: 'cantidad', etiqueta: 'Cant.', tipo: 'number' },
        ],
        'Agregar',
        ({ nombre = '', marca = '', cantidad = '' }) => {
          cambiar((d) => {
            d.listas
              .find((x) => x.id === lista.id)
              ?.productos.push({ id: nuevoId(), nombre: nombre.trim(), marca: marca.trim() || undefined, cantidad: Number(cantidad) || 1 });
          });
          redibujar();
        },
      ),
    );

    const { sitios } = leer();
    contenedor.append(el('h2', {}, 'Buscar precios en'));
    if (!sitios.length) {
      contenedor.append(vacio('Primero crea un sitio en el inicio.'));
      return;
    }
    contenedor.append(
      el('div', { class: 'grilla' }, ...sitios.map((s) => boton(s.nombre, () => navegar('comparar', { lista: lista.id, sitio: s.id })))),
      el('p', {}, el('a', { href: `#/minilista?lista=${lista.id}` }, 'Ver dónde compro cada cosa →')),
    );
  },
};
