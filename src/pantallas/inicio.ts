// Inicio: las listas de compras, las despensas (con sus planes de comidas)
// y los sitios (direcciones) del usuario.

import { cambiar, leer, nuevoId } from '../datos/almacen.ts';
import { navegar, type Pantalla } from '../router.ts';
import { el, enlace, formulario, vacio } from '../ui/dom.ts';

export const pantallaInicio: Pantalla = {
  titulo: 'MerCam',
  render(contenedor) {
    const { listas, sitios, despensas, articulos, planes } = leer();

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

      el('h2', {}, 'Mi despensa'),
      el('p', { class: 'ayuda' }, 'Lo que tienes en casa, lo que pagaste por cada cosa y tus planes de comidas.'),
      despensas.length
        ? el(
            'div',
            { class: 'grilla' },
            ...despensas.map((d) => {
              const productos = articulos.filter((a) => a.despensaId === d.id).length;
              const deEsta = planes.filter((p) => p.despensaId === d.id).length;
              return enlace(`${d.nombre} · ${productos} productos${deEsta ? ` · ${deEsta} planes` : ''}`, `despensa?id=${d.id}`);
            }),
          )
        : vacio('Todavía no tienes despensas.'),
      formulario([{ nombre: 'nombre', etiqueta: 'Nueva despensa (p. ej. Casa)', requerido: true }], 'Crear', ({ nombre = '' }) => {
        const id = nuevoId();
        cambiar((d) => d.despensas.push({ id, nombre: nombre.trim(), creada: new Date().toISOString() }));
        navegar('despensa', { id });
      }),

      el('h2', {}, 'Mis sitios'),
      el('p', { class: 'ayuda' }, 'Un sitio es una dirección: MerCam busca los supermercados que hay cerca.'),
      sitios.length
        ? el('div', { class: 'grilla' }, ...sitios.map((s) => enlace(s.nombre, `sitio?id=${s.id}`)))
        : vacio('Todavía no tienes sitios.'),
      enlace('+ Nuevo sitio', 'sitio-nuevo', 'boton'),

      el(
        'p',
        { class: 'pie' },
        el('a', { href: '#/catalogos' }, 'Marcas, unidades y categorías'),
        ' · ',
        el('a', { href: '#/respaldo' }, 'Respaldo e importar Cambasket'),
      ),
    );
  },
};
