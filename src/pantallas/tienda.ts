// Una tienda: su enlace si vende online y, para las manuales, los precios
// que carga el usuario (mantenerlos al día es cosa suya).

import type { Oferta } from '../../compartido/tipos.ts';
import { claveManual } from '../logica/comparar.ts';
import { TEXTO_REFERENCIA, medidaDeContenido, medidaDeTitulo, precioDeReferencia, textoContenido } from '../logica/medidas.ts';
import { anotarPrecio } from '../logica/historial.ts';
import { cambiar, leer } from '../datos/almacen.ts';
import { redibujar, type Pantalla } from '../router.ts';
import { boton, el, formulario, pesos, plegable, precio, puntoOnline, vacio, type Campo } from '../ui/dom.ts';
import { camposDeContenido, leerContenido } from './comunes.ts';

const MONEDA_MANUAL = '$';

/** El nombre que se escribió: el título sin la marca del final. */
function nombreSinMarca(o: Oferta): string {
  return o.marca && o.titulo.endsWith(` ${o.marca}`) ? o.titulo.slice(0, -o.marca.length - 1) : o.titulo;
}

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
      contenedor.append(el('p', {}, puntoOnline(), 'Vende online: ', el('a', { href: tienda.online.url, target: '_blank', rel: 'noopener' }, tienda.online.url)));
    } else if (tienda.origen === 'mapeada') {
      contenedor.append(el('p', { class: 'ayuda' }, 'No encontramos su tienda online. Puedes cargar sus precios a mano.'));
    }

    const datos = leer();
    const nombreUnidad = (id?: string) => datos.unidades.find((u) => u.id === id);
    const manuales = datos.ofertas.filter((o) => o.tiendaId === tienda.id && o.origen === 'manual');

    /** Guarda (o reemplaza, si se está editando) un precio manual. */
    const guardarPrecio = (v: Record<string, string>, anterior?: Oferta) => {
      const nombre = (v.nombre ?? '').trim();
      const marca = (v.marca ?? '').trim();
      const valor = Number(v.precio);
      if (!nombre || !(valor > 0)) return;
      const titulo = marca ? `${nombre} ${marca}` : nombre;
      const productoId = claveManual(titulo);
      const contenido = leerContenido(v.contenido, v.contenidoUnidadId);
      cambiar((d) => {
        d.ofertas = d.ofertas.filter(
          (o) => !(o.tiendaId === tienda.id && o.origen === 'manual' && ((o.productoId === productoId && o.titulo === titulo) || (anterior && o.productoId === anterior.productoId && o.titulo === anterior.titulo))),
        );
        d.ofertas.push({
          tiendaId: tienda.id,
          productoId,
          titulo,
          marca: marca || undefined,
          precio: valor,
          moneda: MONEDA_MANUAL,
          origen: 'manual',
          actualizada: new Date().toISOString(),
          ...(contenido.contenido ? contenido : {}),
        });
        anotarPrecio(d.historial, { producto: nombre, titulo, tienda: tienda.nombre, tiendaId: tienda.id, precio: valor, moneda: MONEDA_MANUAL, origen: 'manual' });
      });
      redibujar();
    };

    const campos = (o?: Oferta): Campo[] => [
      { nombre: 'nombre', etiqueta: 'Producto (p. ej. Leche entera de Toro)', requerido: true, valor: o ? nombreSinMarca(o) : '' },
      { nombre: 'marca', etiqueta: 'Marca (opcional)', valor: o?.marca ?? '' },
      ...camposDeContenido(o?.contenido, o?.contenidoUnidadId),
      { nombre: 'precio', etiqueta: 'Precio', tipo: 'number', requerido: true, valor: o ? String(o.precio) : '' },
    ];

    contenedor.append(
      el('h2', {}, 'Precios cargados a mano'),
      manuales.length
        ? el(
            'ul',
            { class: 'filas' },
            ...manuales.map((o) => {
              const medida = medidaDeContenido(o.contenido, nombreUnidad(o.contenidoUnidadId)) ?? medidaDeTitulo(o.titulo);
              const tamano = textoContenido(o.contenido, nombreUnidad(o.contenidoUnidadId));
              return el(
                'li',
                {},
                el(
                  'div',
                  { class: 'crece' },
                  el('span', {}, el('strong', {}, precio(o.precio, o.moneda)), ` ${o.titulo}${tamano ? ` · ${tamano}` : ''}`),
                  el(
                    'small',
                    { class: 'bloque' },
                    [medida ? `≈ ${pesos(precioDeReferencia(o.precio, medida))}/${TEXTO_REFERENCIA[medida.base]}` : 'Sin contenido: agrégalo para comparar por litro o kilo', new Date(o.actualizada).toLocaleDateString('es-CO')].join(' · '),
                  ),
                  plegable('Editar', formulario(campos(o), 'Guardar', (v) => guardarPrecio(v, o), { limpiar: false })),
                ),
                boton('Quitar', () => {
                  cambiar((d) => {
                    d.ofertas = d.ofertas.filter((y) => !(y.tiendaId === o.tiendaId && y.productoId === o.productoId && y.titulo === o.titulo));
                  });
                  redibujar();
                }, 'secundario'),
              );
            }),
          )
        : vacio('Sin precios todavía.'),
      el('h2', {}, 'Agregar precio'),
      el('p', { class: 'ayuda' }, 'Sale en el comparador para cualquier producto de tu lista cuyas palabras estén en este nombre: "Leche entera de Toro" aparece al buscar "leche" o "leche entera".'),
      formulario(campos(), 'Guardar precio', (v) => guardarPrecio(v)),
    );
  },
};
