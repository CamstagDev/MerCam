// Marcas, unidades de medida y categorías de los productos de la despensa.
// No se borran (hay productos que las usan): se apagan y dejan de
// ofrecerse al crear productos.

import type { ItemCatalogo } from '../../compartido/tipos.ts';
import { cambiar, leer, nuevoId, type Datos } from '../datos/almacen.ts';
import { redibujar, type Pantalla } from '../router.ts';
import { boton, el, formulario, insignia, plegable, vacio } from '../ui/dom.ts';

type Catalogo = 'marcas' | 'unidades' | 'categorias';

const TITULOS: Record<Catalogo, [string, string]> = {
  marcas: ['Marcas', 'Nueva marca (p. ej. Diana)'],
  unidades: ['Unidades de medida', 'Nueva unidad (p. ej. Bolsa)'],
  categorias: ['Categorías', 'Nueva categoría (p. ej. Lácteos)'],
};

function enUso(datos: Readonly<Datos>, catalogo: Catalogo, id: string): number {
  return datos.articulos.filter((a) =>
    catalogo === 'marcas' ? a.marcaId === id : catalogo === 'unidades' ? a.unidadId === id : a.categoriaIds.includes(id),
  ).length;
}

function seccion(catalogo: Catalogo): HTMLElement[] {
  const datos = leer();
  const items: ItemCatalogo[] = [...datos[catalogo]].sort((a, b) => Number(b.activo) - Number(a.activo) || a.nombre.localeCompare(b.nombre));
  const [titulo, ayuda] = TITULOS[catalogo];
  const actualizar = (id: string, cambio: (x: ItemCatalogo) => void) => {
    cambiar((d) => {
      const x = d[catalogo].find((y) => y.id === id);
      if (x) cambio(x);
    });
    redibujar();
  };
  return [
    el('h2', {}, titulo),
    items.length
      ? el(
          'ul',
          { class: 'filas' },
          ...items.map((item) =>
            el(
              'li',
              { class: item.activo ? '' : 'cancelado' },
              el(
                'div',
                { class: 'crece' },
                el('span', {}, item.nombre, el('small', {}, ` · ${enUso(datos, catalogo, item.id)} productos`), item.activo ? null : insignia('Apagada', 'negativo')),
                plegable(
                  'Renombrar',
                  formulario([{ nombre: 'nombre', etiqueta: 'Nombre', valor: item.nombre, requerido: true }], 'Guardar', ({ nombre = '' }) => actualizar(item.id, (x) => (x.nombre = nombre.trim())), {
                    limpiar: false,
                  }),
                ),
              ),
              boton(item.activo ? 'Apagar' : 'Encender', () => actualizar(item.id, (x) => (x.activo = !x.activo)), 'secundario'),
            ),
          ),
        )
      : vacio('Todavía no hay ninguna.'),
    formulario([{ nombre: 'nombre', etiqueta: ayuda, requerido: true }], 'Agregar', ({ nombre = '' }) => {
      cambiar((d) => d[catalogo].push({ id: nuevoId(), nombre: nombre.trim(), activo: true }));
      redibujar();
    }),
  ];
}

export const pantallaCatalogos: Pantalla = {
  titulo: 'Marcas, unidades y categorías',
  volverA: 'inicio',
  render(contenedor) {
    contenedor.append(...seccion('unidades'), ...seccion('marcas'), ...seccion('categorias'));
  },
};
