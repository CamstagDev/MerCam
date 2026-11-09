import './estilos.css';
import { RUTA_INICIO, iniciarRouter, registrarPantalla } from './router.ts';
import { pantallaInicio } from './pantallas/inicio.ts';
import { pantallaLista } from './pantallas/lista.ts';
import { pantallaSitio, pantallaSitioNuevo } from './pantallas/sitios.ts';
import { pantallaTienda } from './pantallas/tienda.ts';
import { pantallaComparar } from './pantallas/comparar.ts';
import { pantallaMinilista } from './pantallas/minilista.ts';
import { el } from './ui/dom.ts';
import { VERSION_APP } from './version.ts';

registrarPantalla(RUTA_INICIO, pantallaInicio);
registrarPantalla('lista', pantallaLista);
registrarPantalla('sitio-nuevo', pantallaSitioNuevo);
registrarPantalla('sitio', pantallaSitio);
registrarPantalla('tienda', pantallaTienda);
registrarPantalla('comparar', pantallaComparar);
registrarPantalla('minilista', pantallaMinilista);

const barra = document.getElementById('barra')!;
const app = document.getElementById('app')!;

iniciarRouter((pantalla, params) => {
  const titulo = typeof pantalla.titulo === 'function' ? pantalla.titulo(params) : pantalla.titulo;
  const volverA = typeof pantalla.volverA === 'function' ? pantalla.volverA(params) : pantalla.volverA;
  barra.replaceChildren(
    volverA ? el('a', { href: `#/${volverA}`, class: 'volver', 'aria-label': 'Volver' }, '←') : el('span', { class: 'logo' }, 'M'),
    el('h1', {}, titulo),
    el('small', { class: 'version' }, `v${VERSION_APP}`),
  );
  app.replaceChildren();
  pantalla.render(app, params);
  window.scrollTo(0, 0);
});
