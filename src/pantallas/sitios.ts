// Sitios: crear uno (y mapear sus supermercados), ver sus tiendas y
// agregar tiendas manuales (almacenes de barrio que no tienen web).

import type { Sitio } from '../../compartido/tipos.ts';
import { cambiar, leer, nuevoId } from '../datos/almacen.ts';
import { mapear } from '../datos/servidor.ts';
import { miUbicacion, ubicarDireccion } from '../datos/ubicacion.ts';
import { navegar, redibujar, type Pantalla } from '../router.ts';
import { boton, el, enlace, formulario, vacio } from '../ui/dom.ts';

const RADIO_POR_DEFECTO = 2000;

/**
 * Busca los supermercados cerca del sitio y suma los que no estaban. Si el
 * sitio ya tiene coordenadas exactas (GPS o teléfono) se usan; si no, se
 * prueba el buscador de direcciones del teléfono y, si tampoco, el
 * servidor busca la dirección en OpenStreetMap.
 */
async function mapearSitio(sitio: Sitio): Promise<number> {
  const exactas = sitio.fuente === 'gps' || sitio.fuente === 'telefono';
  let coordenadas = exactas ? { lat: sitio.lat, lon: sitio.lon } : null;
  let fuente: Sitio['fuente'] = exactas ? sitio.fuente : undefined;
  if (!coordenadas) {
    coordenadas = await ubicarDireccion(sitio.direccion);
    if (coordenadas) fuente = 'telefono';
  }
  const respuesta = await mapear({ direccion: sitio.direccion, radioM: sitio.radioM, coordenadas: coordenadas ?? undefined });
  let nuevas = 0;
  cambiar((d) => {
    const s = d.sitios.find((x) => x.id === sitio.id);
    if (s) {
      s.lat = respuesta.coordenadas.lat;
      s.lon = respuesta.coordenadas.lon;
      s.fuente = fuente ?? 'servidor';
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
    // Si se usó el GPS, sus coordenadas; se descartan si después se edita la dirección.
    let gps: { lat: number; lon: number } | null = null;

    const form = el('form', { class: 'formulario' });
    const nombre = el('input', { name: 'nombre', placeholder: 'Nombre (p. ej. Casa)' });
    const direccion = el('input', { name: 'direccion', placeholder: 'Dirección, ciudad (p. ej. Calle 5 # 38-25, Cali)' });
    const radio = el('input', { name: 'radio', type: 'number', placeholder: `Radio en metros (${RADIO_POR_DEFECTO})` });
    nombre.required = true;
    direccion.required = true;
    direccion.addEventListener('input', () => {
      gps = null;
    });

    const usarUbicacion = boton('📍 Usar mi ubicación', async () => {
      estado.textContent = 'Buscando tu ubicación…';
      try {
        const actual = await miUbicacion();
        gps = actual.coordenadas;
        direccion.value = actual.direccion;
        estado.textContent = 'Listo: se usará tu ubicación exacta.';
      } catch (error) {
        estado.textContent = `No se pudo leer tu ubicación: ${error instanceof Error ? error.message : error}`;
      }
    }, 'secundario');

    form.append(nombre, direccion, usarUbicacion, radio, el('button', { type: 'submit' }, 'Crear y buscar supermercados'));
    form.addEventListener('submit', async (evento) => {
      evento.preventDefault();
      const sitio: Sitio = {
        id: nuevoId(),
        nombre: nombre.value.trim(),
        direccion: direccion.value.trim(),
        radioM: Number(radio.value) || RADIO_POR_DEFECTO,
        lat: gps?.lat ?? 0,
        lon: gps?.lon ?? 0,
        fuente: gps ? 'gps' : undefined,
        mapeado: null,
      };
      cambiar((d) => d.sitios.push(sitio));
      estado.textContent = 'Buscando supermercados cercanos… (puede tardar hasta un minuto)';
      try {
        await mapearSitio(sitio);
      } catch (error) {
        alert(`No se pudo mapear: ${error instanceof Error ? error.message : error}. Puedes reintentar desde el sitio.`);
      }
      navegar('sitio', { id: sitio.id });
    });

    contenedor.append(form, estado);
  },
};

/** Fija el sitio en la ubicación actual del GPS y lo vuelve a mapear. */
async function corregirConGps(sitio: Sitio): Promise<number> {
  const { coordenadas } = await miUbicacion();
  cambiar((d) => {
    const s = d.sitios.find((x) => x.id === sitio.id);
    if (s) Object.assign(s, { lat: coordenadas.lat, lon: coordenadas.lon, fuente: 'gps' });
  });
  return mapearSitio({ ...sitio, ...coordenadas, fuente: 'gps' });
}

const TEXTO_FUENTE: Record<NonNullable<Sitio['fuente']>, string> = {
  gps: 'ubicación del GPS',
  telefono: 'ubicada por el teléfono',
  servidor: 'ubicación aproximada (OpenStreetMap)',
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
      el(
        'p',
        { class: 'ayuda' },
        sitio.direccion,
        sitio.fuente ? ` · ${TEXTO_FUENTE[sitio.fuente]}` : '',
        sitio.mapeado ? ` · mapeado ${new Date(sitio.mapeado).toLocaleDateString()}` : ' · sin mapear',
      ),
      el(
        'p',
        { class: 'formulario' },
        ...(
          [
            ['Volver a buscar supermercados', () => mapearSitio(sitio)],
            ['📍 Estoy aquí: usar mi ubicación', () => corregirConGps(sitio)],
          ] as const
        ).map(([texto, accion]) =>
          boton(texto, async () => {
            estado.textContent = ' Buscando… (puede tardar hasta un minuto)';
            try {
              const nuevas = await accion();
              alert(`Listo: ${nuevas} tiendas nuevas.`);
            } catch (error) {
              alert(`No se pudo mapear: ${error instanceof Error ? error.message : error}`);
            }
            redibujar();
          }, 'secundario'),
        ),
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
