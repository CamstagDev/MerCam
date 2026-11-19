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
- Cambasket entra en MerCam: despensas con productos (nombre general,
  unidad, marca, categorías), compras y consumos con stock y precio
  promedio, mercados guardados, y marcas, unidades y categorías.
- Planes de comidas: las comidas separan lo que usan, se ejecutan (y se
  deshacen), y lo que falta se pasa a una lista para comparar precios en
  los supermercados cercanos.
- Historial de precios por tienda: al comparar, cada oferta dice si es la
  más baja vista, si está en oferta o más cara que lo usual.
- Listas: marcar como comprado (suma a la despensa con el precio y la
  tienda elegidos), editar cantidad, marca y precio estimado, agregar
  desde la despensa o un mercado guardado, y el total aproximado.
- Respaldo: descargar y restaurar los datos, e importar los de Cambasket
  (`npm run importar:cambasket`).
