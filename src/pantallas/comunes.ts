// Piezas que usan varias pantallas de la despensa.

import type { Articulo } from '../../compartido/tipos.ts';
import { leer, nuevoId, type Datos } from '../datos/almacen.ts';
import { campo, el, type Campo } from '../ui/dom.ts';

type CamposArticulo = Pick<Articulo, 'nombre' | 'generico' | 'descripcion' | 'unidadId' | 'marcaId' | 'categoriaIds' | 'contenido' | 'contenidoUnidadId'>;

/**
 * Campos de "contenido" de un producto: cuánto trae cada unidad y en qué
 * unidad de medida (1000 + ml, 1 + L, 500 + g). Sirve para comparar el
 * precio por litro o por kilo entre tamaños distintos.
 */
export function camposContenido(contenido?: number, unidadId?: string): HTMLElement[] {
  const unidades = leer().unidades.filter((u) => u.activo || u.id === unidadId);
  return [
    campo({ nombre: 'contenido', etiqueta: 'Contenido (p. ej. 1000)', tipo: 'number', paso: 'any', valor: contenido ? String(contenido) : '' }),
    campo({
      nombre: 'contenidoUnidadId',
      etiqueta: 'Unidad del contenido',
      opciones: [{ valor: '', texto: 'Unidad del contenido' }, ...unidades.map((u) => ({ valor: u.id, texto: u.nombre }))],
      valor: unidadId ?? '',
    }),
  ];
}

/** Los mismos campos de contenido, para usarlos dentro de formulario(). */
export function camposDeContenido(contenido?: number, unidadId?: string): Campo[] {
  const unidades = leer().unidades.filter((u) => u.activo || u.id === unidadId);
  return [
    { nombre: 'contenido', etiqueta: 'Contenido (p. ej. 1000)', tipo: 'number', paso: 'any', valor: contenido ? String(contenido) : '' },
    {
      nombre: 'contenidoUnidadId',
      etiqueta: 'Unidad de medida',
      opciones: [{ valor: '', texto: 'Unidad de medida' }, ...unidades.map((u) => ({ valor: u.id, texto: u.nombre }))],
      valor: unidadId ?? '',
    },
  ];
}

/** Lee el contenido de un formulario: solo cuenta si hay cantidad y unidad. */
export function leerContenido(contenido: unknown, unidadId: unknown): Pick<Articulo, 'contenido' | 'contenidoUnidadId'> {
  const valor = Number(contenido);
  const unidad = String(unidadId ?? '');
  return valor > 0 && unidad ? { contenido: valor, contenidoUnidadId: unidad } : { contenido: undefined, contenidoUnidadId: undefined };
}

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
    etiqueta: 'Se cuenta por (Unidad, Paquete…)',
    opciones: unidades.map((u) => ({ valor: u.id, texto: `Se cuenta por: ${u.nombre}` })),
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
    ...camposContenido(articulo?.contenido, articulo?.contenidoUnidadId),
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
      ...leerContenido(valores.get('contenido'), valores.get('contenidoUnidadId')),
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
