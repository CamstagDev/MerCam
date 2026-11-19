// Piezas que usan varias pantallas de la despensa.

import type { Articulo } from '../../compartido/tipos.ts';
import { leer, nuevoId, type Datos } from '../datos/almacen.ts';
import { campo, el } from '../ui/dom.ts';

type CamposArticulo = Pick<Articulo, 'nombre' | 'generico' | 'descripcion' | 'unidadId' | 'marcaId' | 'categoriaIds'>;

/**
 * Formulario de un artículo: nombre general (con autocompletado de los que
 * ya existen), título (se copia del nombre general hasta que se toca),
 * unidad, marca opcional, categorías y descripción.
 */
export function formularioArticulo(
  articulo: Articulo | undefined,
  textoBoton: string,
  alGuardar: (campos: CamposArticulo) => void,
): HTMLFormElement {
  const datos = leer();
  const genericos = [...new Set(datos.articulos.map((a) => a.generico))].sort();
  const activos = <T extends { activo: boolean; id: string }>(items: T[], actual?: string) => items.filter((i) => i.activo || i.id === actual);

  const generico = campo({ nombre: 'generico', etiqueta: 'Nombre general (p. ej. Arroz)', requerido: true, valor: articulo?.generico, sugerencias: genericos });
  const titulo = campo({ nombre: 'nombre', etiqueta: 'Título (p. ej. Arroz Diana x 500 g)', requerido: true, valor: articulo?.nombre }) as HTMLInputElement;
  const unidades = activos(datos.unidades, articulo?.unidadId);
  const unidad = campo({
    nombre: 'unidadId',
    etiqueta: 'Unidad',
    opciones: unidades.map((u) => ({ valor: u.id, texto: u.nombre })),
    valor: articulo?.unidadId ?? unidades[0]?.id,
    requerido: true,
  });
  const marca = campo({
    nombre: 'marcaId',
    etiqueta: 'Marca',
    opciones: [{ valor: '', texto: 'Sin marca' }, ...activos(datos.marcas, articulo?.marcaId).map((m) => ({ valor: m.id, texto: m.nombre }))],
    valor: articulo?.marcaId ?? '',
  });
  const descripcion = campo({ nombre: 'descripcion', etiqueta: 'Descripción (opcional)', valor: articulo?.descripcion });

  let tituloTocado = Boolean(articulo);
  const inputGenerico = generico.querySelector('input') ?? (generico as HTMLInputElement);
  inputGenerico.addEventListener('input', () => {
    if (!tituloTocado) titulo.value = inputGenerico.value;
  });
  titulo.addEventListener('input', () => (tituloTocado = true));

  const categorias = activos(datos.categorias).concat(
    datos.categorias.filter((c) => !c.activo && articulo?.categoriaIds.includes(c.id)),
  );
  const casillas = el(
    'div',
    { class: 'chips' },
    ...categorias.map((c) => {
      const input = el('input', { type: 'checkbox', name: 'categoria', value: c.id });
      input.checked = Boolean(articulo?.categoriaIds.includes(c.id));
      return el('label', { class: 'chip' }, input, c.nombre);
    }),
  );

  const form = el(
    'form',
    { class: 'formulario' },
    generico,
    titulo,
    unidad,
    marca,
    descripcion,
    categorias.length ? casillas : el('small', { class: 'ayuda' }, 'Sin categorías: créalas en "Marcas, unidades y categorías".'),
    el('button', { type: 'submit' }, textoBoton),
  );
  form.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const valores = new FormData(form);
    const texto = (nombre: string) => String(valores.get(nombre) ?? '').trim();
    if (!texto('unidadId')) {
      alert('Primero crea una unidad de medida.');
      return;
    }
    alGuardar({
      generico: texto('generico'),
      nombre: texto('nombre') || texto('generico'),
      descripcion: texto('descripcion') || undefined,
      unidadId: texto('unidadId'),
      marcaId: texto('marcaId') || undefined,
      categoriaIds: valores.getAll('categoria').map(String),
    });
  });
  return form;
}

export function opcionesDeListas(): { valor: string; texto: string }[] {
  return [...leer().listas.map((l) => ({ valor: l.id, texto: l.nombre })), { valor: 'nueva', texto: '+ Lista nueva' }];
}

/** El id de la lista elegida; con "nueva" la crea con ese nombre. */
export function resolverLista(d: Datos, valor: string, nombreNueva: string): string {
  if (valor !== 'nueva' && d.listas.some((l) => l.id === valor)) return valor;
  const id = nuevoId();
  d.listas.push({ id, nombre: nombreNueva, productos: [], creada: new Date().toISOString() });
  return id;
}
