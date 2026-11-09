# Cambios de MerCam

Cada versión publicada tiene su sección. Lo que se va haciendo se anota
en "Sin publicar"; `npm run version:nueva` la convierte en la sección de
la versión nueva (ver scripts/nueva-version.mjs).

## Sin publicar

- Primera versión: listas de compras con marca opcional, sitios
  (direcciones) con los supermercados cercanos, tiendas manuales con
  precios a mano, comparación de precios (las 3 más baratas por producto,
  "Ver más" para todas) y la minilista de qué comprar en cada tienda.
- Servidor de búsqueda: mapeo con OpenStreetMap y precios de tiendas VTEX.
- Cali: Éxito, Carulla, Olímpica, Jumbo/Metro y D1 se reconocen al mapear
  y se buscan sus precios online.
- Mercamio: al mapear un sitio se suman sus sedes cercanas, cada una con
  sus propios precios.
- Cada cadena tiene su archivo en servidor/cadenas/ para editarla,
  exportarla o importarla sin tocar código.
- Las direcciones se buscan solo en Colombia.
- Sitios con ubicación exacta: "Usar mi ubicación" (GPS) al crear un
  sitio, "Estoy aquí" para corregir uno, y en Android la dirección se
  busca con el buscador del propio teléfono (sin claves de Google).
