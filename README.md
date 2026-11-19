# MerCam

Arma tu lista de compras y MerCam busca cada producto en los
supermercados de tu zona para que sepas qué comprar dónde y gastes menos.
Los precios de las tiendas online se buscan en el momento (los descuentos
cambian de un día a otro); los almacenes sin página web se agregan a mano
con sus precios. Además lleva tu despensa (lo que tienes en casa y cuánto
pagaste), tus planes de comidas y el historial de precios de cada
producto, para saber si una oferta lo es de verdad. (La despensa y los
planes vienen de Cambasket, que quedó dentro de MerCam.)

## Cómo funciona

1. **Sitios.** Creas un sitio con una dirección ("Casa") o con tu
   ubicación (GPS). En Android la dirección la ubica el propio teléfono;
   en el navegador, OpenStreetMap (menos preciso). MerCam busca
   los supermercados cercanos (OpenStreetMap) y revisa cuáles venden
   online. Esto se hace pocas veces: es "mapear" la zona.
2. **Tiendas manuales.** En un sitio puedes agregar tiendas a mano
   (almacenes de barrio, ferias) y cargar sus precios. Mantenerlos al día
   es cosa tuya.
3. **Listas.** Productos con cantidad y, si quieres, marca.
4. **Comparar.** Eliges lista y sitio. MerCam busca cada producto en las
   tiendas online del sitio (con marca: busca con y sin ella, y muestra
   primero los de la marca). Por producto se ven los 3 más baratos y
   "Ver más" muestra todos. Cada búsqueda actualiza los precios.
5. **Minilista.** Tocas "Elegir" en la oferta que quieres y MerCam arma
   la lista de qué comprar en cada tienda, con el total y el enlace a la
   tienda online (la compra se hace en su página).
6. **Despensa.** Productos con nombre general ("Arroz"), título ("Arroz
   Diana x 500 g"), unidad, marca y categorías. Registras compras (con
   precio y tienda) y consumos; el stock y el precio promedio salen de
   ahí. Puedes guardar grupos de productos como "mercados" ("Obligatorios
   del mes") y pasarlos a una lista de una vez. Al marcar como comprado
   algo de una lista, se suma a la despensa con el precio de la oferta
   elegida.
7. **Planes de comidas.** Un plan tiene comidas y cada comida usa
   productos de la despensa: mientras está pendiente, eso queda separado;
   al ejecutarla se descuenta (y se puede deshacer). "Pasar a una lista y
   comparar precios" arma la lista con lo que falta y desde ahí lo buscas
   en los supermercados cercanos.
8. **Historial de precios.** Cada precio que MerCam ve (búsquedas, precios
   a mano, compras) se anota por tienda, uno por día. Al comparar, cada
   oferta dice si es "El más bajo visto", "En oferta" (7 % o más bajo que
   su promedio) o "Más caro que lo usual"; en cada producto de la
   despensa se ve su historial con un minigráfico.

Como todo vive en el dispositivo, en **Respaldo** descargas una copia,
la restauras o importas tus datos de Cambasket.

## Plataformas

- **Android**, empaquetado con Capacitor.
- **Navegador** (web).

Las dos comparten el mismo código (`src/`). Sin app de Windows.

## Tecnologías

- **TypeScript** en modo estricto. `npm run tipos` revisa los tipos; Vite
  compila la app y Node 24 corre el servidor directamente (entiende
  TypeScript sin compilar).
- **Vite** para el servidor de desarrollo y el build; **Vitest** para las
  pruebas. Pantallas en TypeScript sin framework, con un router por hash
  como el de SudoCam.
- **Servidor de búsqueda** (`servidor/`): Node + Express. La app no puede
  leer las tiendas online directamente (CORS), así que se lo pide a él.
  No guarda nada: los datos del usuario viven en la app (localStorage).

## Comandos

En Windows, doble clic en `Iniciar MerCam.cmd` levanta el servidor y la
app y abre el navegador; la primera vez instala las librerías.

| Comando | Qué hace |
|---|---|
| `npm run dev` | Abre la app en http://localhost:5176, con recarga al guardar |
| `npm run servidor` | Levanta el servidor de búsqueda en http://localhost:3010 (`servidor:dev` lo reinicia al guardar) |
| `npm test` | Corre las pruebas automáticas |
| `npm run tipos` | Revisa los tipos de TypeScript |
| `npm run android:apk` | Genera `android/app/build/outputs/apk/debug/app-debug.apk` |
| `npm run importar:cambasket -- tu@correo.com` | Lee la base de Cambasket (PostgreSQL) y deja `cambasket-a-mercam.json` para cargarlo en la app desde Respaldo. La clave de la base va en `PGPASSWORD` |
| `npm run version:nueva -- parche` | Nueva versión (parche, menor o mayor): cambia el número, cierra el CHANGELOG, hace commit y etiqueta. Con `git push --follow-tags`, GitHub compila y publica el APK |

En Android la app necesita la dirección del servidor: crea un `.env` con
`VITE_SERVIDOR=http://<ip-del-pc>:3010` antes de `npm run android:apk`
(en GitHub, el secreto `MERCAM_SERVIDOR`).

Para Android no hace falta Android Studio: basta con un JDK 21 y las
herramientas de línea de comandos del SDK de Android, con las variables
`JAVA_HOME` y `ANDROID_HOME` apuntando a ellos.

## Dónde está cada cosa

| Carpeta | Qué hay |
|---|---|
| `compartido/tipos.ts` | Los tipos de la app y el contrato con el servidor: Sitio, Tienda, Lista, Producto, Oferta, Elección; y los de la despensa: Despensa, Artículo, Movimiento, Mercado, Plan, Comida, SeriePrecio |
| `src/pantallas/` | Inicio, lista, sitios, tienda, comparar, minilista, despensa, artículo, catálogos, planes y comidas, respaldo |
| `src/logica/comparar.ts` | Orden de ofertas (marca primero, más baratas), "Ver más" y la minilista |
| `src/logica/despensa.ts` | Stock, precio promedio, lo separado por los planes, ejecutar comidas, marcar comprado, lo que falta para un plan |
| `src/logica/historial.ts` | Historial de precios y si un precio es oferta, mínimo o caro |
| `src/logica/importarCambasket.ts` | Pasa las tablas de Cambasket al formato de MerCam (lo usa `scripts/importar-cambasket.ts`) |
| `src/datos/` | `almacen.ts` (localStorage) y `servidor.ts` (llamadas al servidor) |
| `servidor/cadenas/` | Un archivo JSON por cadena de supermercados |
| `servidor/mapeo/` | Dirección → coordenadas (Nominatim), supermercados cercanos (Overpass) y si venden online |
| `servidor/buscadores/` | Un buscador por plataforma de tienda online. Hoy: VTEX (Éxito, Carulla, Olímpica, Jumbo/Metro, D1) y Mercamio (precio por sede) |
| `servidor/busqueda.ts` | Busca una lista en varias tiendas |
| `tests/` | Pruebas de Vitest |

### Cadenas de supermercados

Cada cadena tiene su archivo en `servidor/cadenas/` (`exito.json`,
`mercamio.json`...): nombre, palabras con las que se reconocen sus
tiendas en OpenStreetMap (`alias`), su tienda online (`url` y qué
buscador usar) o `null` si se sabe que no vende online, y notas. Para
sumar, cambiar, exportar o importar una cadena basta con copiar o editar
su archivo y reiniciar el servidor; el formato está explicado en
`servidor/cadenas/cadenas.ts`. `GET /api/cadenas` muestra las cargadas.

Si la cadena no tiene archivo pero usa VTEX y OpenStreetMap trae su
sitio web, se detecta sola al mapear. Para una plataforma nueva, crea un
buscador en `servidor/buscadores/` (ver `buscador.ts`) y súmalo en
`registro.ts`.

Las direcciones se buscan solo en Colombia (`MERCAM_PAIS=co`).
