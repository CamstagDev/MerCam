// Inicio: las listas de compras y los sitios (direcciones) del usuario.

import { cambiar, leer, nuevoId } from '../datos/almacen.ts';
import { navegar, type Pantalla } from '../router.ts';
import { el, enlace, formulario, vacio } from '../ui/dom.ts';

export const pantallaInicio: Pantalla = {
  titulo: 'MerCam',
  render(contenedor) {
    const { listas, sitios } = leer();

    contenedor.append(
      el('h2', {}, 'Mis listas'),
      listas.length
        ? el('div', { class: 'grilla' }, ...listas.map((l) => enlace(`${l.nombre} (${l.productos.length})`, `lista?id=${l.id}`)))
        : vacio('Todavía no tienes listas.'),
      formulario([{ nombre: 'nombre', etiqueta: 'Nueva lista (p. ej. Semana)', requerido: true }], 'Crear', ({ nombre = '' }) => {
        const id = nuevoId();
        cambiar((d) => d.listas.push({ id, nombre, productos: [], creada: new Date().toISOString() }));
        navegar('lista', { id });
      }),

      el('h2', {}, 'Mis sitios'),
      el('p', { class: 'ayuda' }, 'Un sitio es una dirección: MerCam busca los supermercados que hay cerca.'),
      sitios.length
        ? el('div', { class: 'grilla' }, ...sitios.map((s) => enlace(s.nombre, `sitio?id=${s.id}`)))
        : vacio('Todavía no tienes sitios.'),
      enlace('+ Nuevo sitio', 'sitio-nuevo', 'boton'),
    );
  },
};
