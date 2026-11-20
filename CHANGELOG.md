# Cambios de MerCam

Cada versión publicada tiene su sección. Lo que se va haciendo se anota
en "Sin publicar"; `npm run version:nueva` la convierte en la sección de
la versión nueva (ver scripts/nueva-version.mjs).

## Sin publicar

- Comparar: cada oferta ocupa siempre dos líneas. Arriba, precio y
  producto; abajo, la tienda, el precio por litro o kilo, "+N sitios" para
  ver el mismo producto en otros sitios y "Ver en sitio ↗" si es online.
- Tiendas manuales: los precios llevan contenido y unidad de medida
  (1 + L), se pueden editar, y salen en el comparador para cualquier
  producto de la lista cuyas palabras estén en el nombre ("Leche entera
  de Toro" aparece al buscar "leche entera").
- Comparar: el mismo producto en varios sitios se ve una sola vez, con el
  precio más bajo. Al tocarlo se despliegan los demás sitios y el que se
  toque pasa a ser el que se muestra.
- Comparar: las ofertas repetidas (sedes de una cadena con la misma
  tienda online, mismo producto y precio) se muestran una sola vez con
  todas sus tiendas, y esas sedes se buscan una sola vez.
- Comparar: cada oferta muestra su precio por litro o por kilo (leído del
  título) y, si el producto tiene contenido, cuánto saldría ese tamaño.
- Las tiendas que venden online llevan un punto verde en vez de "online".
- Productos de listas y de la despensa con contenido y unidad de medida
  (p. ej. 1000 ml). Las unidades de medida dicen a qué equivalen (L =
  1000 ml, kg = 1000 g, Docena = 12).
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
- Arreglo: en Android buscar supermercados y precios no funcionaba porque
  la app no tenía servidor al que llamar. Ahora el teléfono busca por su
  cuenta, sin necesitar el PC.
- Arreglo: direcciones con placa ("Calle 73 Norte #2-22, Cali") que
  OpenStreetMap no encontraba: si no aparece, se busca la calle sola.
