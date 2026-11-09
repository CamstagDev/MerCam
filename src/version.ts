// Versión de la app, tomada de package.json en tiempo de build (ver
// `define` en vite.config.ts). Es la única fuente de verdad: la app y el
// build de Android leen este mismo número.
declare const __APP_VERSION__: string;
export const VERSION_APP = __APP_VERSION__;
