// Marcas, unidades de medida y categorías de los productos de la despensa.
// No se borran (hay productos que las usan): se apagan y dejan de
// ofrecerse al crear productos.

import type { ItemCatalogo } from '../../compartido/tipos.ts';
import { cambiar, leer, nuevoId, type Datos } from '../datos/almacen.ts';
import { redibujar, type Pantalla } from '../router.ts';
import { boton, el, formulario, insignia, plegable, vacio, type Campo } from '../ui/dom.ts';
import { reconocerUnidad } from '../logica/medidas.ts';

const OPCIONES_BASE = [
  { valor: '', texto: 'No se convierte (Paquete, Bolsa…)' },
  { valor: 'ml', texto: 'Volumen: cuántos ml' },
  { valor: 'g', texto: 'Peso: cuántos g' },
  { valor: 'und', texto: 'Unidades: cuántas' },
];

/** Para unidades: a qué equivale (con eso se compara el precio por litro o por kilo). */
function camposEquivalencia(item?: ItemCatalogo): Campo[] {
  return [
    { nombre: 'base', etiqueta: 'Equivale a', opciones: OPCIONES_BASE, valor: item?.base ?? '' },
    { nombre: 'factor', etiqueta: 'Cantidad (p. ej. 1000)', tipo: 'number', paso: 'any', valor: item?.factor ? String(item.factor) : '' },
  ];
}

/** Lee base y factor del formulario; si no se indicó, se deduce del nombre ("Litros" -> 1000 ml). */
function equivalencia(nombre: string, v: Record<string, string>): Pick<ItemCatalogo, 'base' | 'factor'> {
  const base = v.base as ItemCatalogo['base'] | '';
  const factor = Number(v.factor);
  if (base && factor > 0) return { base, factor };
  if (base) return { base, factor: 1 };
  return reconocerUnidad(nombre) ?? { base: undefined, factor: undefined };
}

function textoEquivalencia(item: ItemCatalogo): string {
  if (!item.base || !item.factor) return '';
  return ` · = ${item.factor.toLocaleString('es-CO')} ${item.base}`;
}

type Catalogo = 'marcas' | 'unidades' | 'categorias';

const TITULOS: Record<Catalogo, [string, string]> = {
  marcas: ['Marcas', 'Nueva marca (p. ej. Diana)'],
  unidades: ['Unidades de medida', 'Descripción (p. ej. Litros)'],
  categorias: ['Categorías', 'Nueva categoría (p. ej. Lácteos)'],
};

function enUso(datos: Readonly<Datos>, catalogo: Catalogo, id: string): number {
  return datos.articulos.filter((a) =>
    catalogo === 'marcas' ? a.marcaId === id : catalogo === 'unidades' ? a.unidadId === id || a.contenidoUnidadId === id : a.categoriaIds.includes(id),
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
                el(
                  'span',
                  {},
                  item.nombre,
                  el('small', {}, `${catalogo === 'unidades' ? textoEquivalencia(item) : ''} · ${enUso(datos, catalogo, item.id)} productos`),
                  item.activo ? null : insignia('Apagada', 'negativo'),
                ),
                plegable(
                  catalogo === 'unidades' ? 'Editar' : 'Renombrar',
                  formulario(
                    [{ nombre: 'nombre', etiqueta: 'Descripción', valor: item.nombre, requerido: true }, ...(catalogo === 'unidades' ? camposEquivalencia(item) : [])],
                    'Guardar',
                    (v) =>
                      actualizar(item.id, (x) => {
                        x.nombre = (v.nombre ?? '').trim();
                        if (catalogo === 'unidades') Object.assign(x, equivalencia(x.nombre, { base: v.base ?? '', factor: v.factor ?? '0' }));
                      }),
                    { limpiar: false },
                  ),
                ),
              ),
              boton(item.activo ? 'Apagar' : 'Encender', () => actualizar(item.id, (x) => (x.activo = !x.activo)), 'secundario'),
            ),
          ),
        )
      : vacio('Todavía no hay ninguna.'),
    formulario([{ nombre: 'nombre', etiqueta: ayuda, requerido: true }, ...(catalogo === 'unidades' ? camposEquivalencia() : [])], 'Agregar', (v) => {
      const nombre = (v.nombre ?? '').trim();
      const extra = catalogo === 'unidades' ? equivalencia(nombre, { base: v.base ?? '', factor: v.factor ?? '' }) : {};
      cambiar((d) => d[catalogo].push({ id: nuevoId(), nombre, activo: true, ...extra }));
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
