// Sitios: crear uno (y mapear sus supermercados), ver sus tiendas y
// agregar tiendas manuales (almacenes de barrio que no tienen web).

import type { Sitio } from '../../compartido/tipos.ts';
import { cambiar, leer, nuevoId } from '../datos/almacen.ts';
import { mapear } from '../datos/servidor.ts';
import { navegar, redibujar, type Pantalla } from '../router.ts';
import { boton, el, enlace, formulario, vacio } from '../ui/dom.ts';

const RADIO_POR_DEFECTO = 2000;

/** Busca los supermercados cerca del sitio y suma los que no estaban. */
async function mapearSitio(sitio: Sitio): Promise<number> {
  const respuesta = await mapear({ direccion: sitio.direccion, radioM: sitio.radioM });
  let nuevas = 0;
  cambiar((d) => {
    const s = d.sitios.find((x) => x.id === sitio.id);
    if (s) {
      s.lat = respuesta.coordenadas.lat;
      s.lon = respuesta.coordenadas.lon;
      s.mapeado = new Date().toISOString();
    }
    for (const encontrada of respuesta.tiendas) {
      const existente = d.tiendas.find((t) => t.sitioId === sitio.id && t.osmId && t.osmId === encontrada.osmId);
      if (existente) {
        existente.online = encontrada.online;
      } else {
        d.tiendas.push({ ...encontrada, id: nuevoId(), sitioId: sitio.id });
        nuevas++;
      }
    }
  });
  return nuevas;
}

export const pantallaSitioNuevo: Pantalla = {
  titulo: 'Nuevo sitio',
  volverA: 'inicio',
  render(contenedor) {
    const estado = el('p', { class: 'ayuda' });
    contenedor.append(
      formulario(
        [
          { nombre: 'nombre', etiqueta: 'Nombre (p. ej. Casa)', requerido: true },
          { nombre: 'direccion', etiqueta: 'Dirección, ciudad', requerido: true },
          { nombre: 'radio', etiqueta: `Radio en metros (${RADIO_POR_DEFECTO})`, tipo: 'number' },
        ],
        'Crear y buscar supermercados',
        async ({ nombre = '', direccion = '', radio = '' }) => {
          const sitio: Sitio = { id: nuevoId(), nombre, direccion, radioM: Number(radio) || RADIO_POR_DEFECTO, lat: 0, lon: 0, mapeado: null };
          cambiar((d) => d.sitios.push(sitio));
          estado.textContent = 'Buscando supermercados cercanos…';
          try {
            await mapearSitio(sitio);
          } catch (error) {
            alert(`No se pudo mapear: ${error instanceof Error ? error.message : error}. Puedes reintentar desde el sitio.`);
          }
          navegar('sitio', { id: sitio.id });
        },
      ),
      estado,
    );
  },
};

export const pantallaSitio: Pantalla = {
  titulo: (params) => leer().sitios.find((s) => s.id === params.get('id'))?.nombre ?? 'Sitio',
  volverA: 'inicio',
  render(contenedor, params) {
    const sitio = leer().sitios.find((s) => s.id === params.get('id'));
    if (!sitio) {
      contenedor.append(vacio('Este sitio ya no existe.'));
      return;
    }
    const tiendas = leer().tiendas.filter((t) => t.sitioId === sitio.id);
    const estado = el('span', { class: 'ayuda' });

    contenedor.append(
      el('p', { class: 'ayuda' }, sitio.direccion, sitio.mapeado ? ` · mapeado ${new Date(sitio.mapeado).toLocaleDateString()}` : ' · sin mapear'),
      el(
        'p',
        {},
        boton('Volver a buscar supermercados', async () => {
          estado.textContent = ' Buscando…';
          try {
            const nuevas = await mapearSitio(sitio);
            alert(`Listo: ${nuevas} tiendas nuevas.`);
          } catch (error) {
            alert(`No se pudo mapear: ${error instanceof Error ? error.message : error}`);
          }
          redibujar();
        }, 'secundario'),
        estado,
      ),
      el('h2', {}, 'Tiendas'),
      tiendas.length
        ? el(
            'div',
            { class: 'grilla' },
            ...tiendas.map((t) =>
              enlace(`${t.nombre}${t.online ? ' · online' : ''}${t.origen === 'manual' ? ' · manual' : ''}`, `tienda?id=${t.id}`),
            ),
          )
        : vacio('No hay tiendas todavía.'),
      el('h2', {}, 'Agregar una tienda a mano'),
      el('p', { class: 'ayuda' }, 'Para almacenes o ferias sin página web. Sus precios los cargas tú.'),
      formulario(
        [
          { nombre: 'nombre', etiqueta: 'Nombre', requerido: true },
          { nombre: 'direccion', etiqueta: 'Dirección (opcional)' },
        ],
        'Agregar',
        ({ nombre = '', direccion = '' }) => {
          cambiar((d) => d.tiendas.push({ id: nuevoId(), sitioId: sitio.id, nombre, direccion: direccion || undefined, origen: 'manual', online: null }));
          redibujar();
        },
      ),
    );
  },
};
