// Trae los datos de Cambasket (su base PostgreSQL) a un archivo que la app
// de MerCam importa desde "Respaldo → Importar".
//
//   set PGPASSWORD=<clave de la base de Cambasket>
//   npm run importar:cambasket -- tu@correo.com
//
// Deja `cambasket-a-mercam.json` en la carpeta del proyecto. Se traen las
// baskets de las que eres miembro con sus productos, compras y consumos,
// lista de compras, mercados guardados, planificadores y usos, y las
// marcas, unidades y categorías de cada basket. La conversión está en
// src/logica/importarCambasket.ts.
//
// Conexión: por defecto usuario y base `cambasket` en localhost:5432 (como
// el db.js de Cambasket); se cambia con PGHOST, PGPORT, PGUSER,
// PGDATABASE y PGPASSWORD.

import { writeFileSync } from 'node:fs';
import pg from 'pg';
import { convertirCambasket, type TablasCambasket } from '../src/logica/importarCambasket.ts';

const correo = process.argv[2];
const salida = process.argv[3] ?? 'cambasket-a-mercam.json';
if (!correo) {
  console.error('Uso: npm run importar:cambasket -- tu@correo.com [archivo.json]');
  process.exit(1);
}

const cliente = new pg.Client({
  host: process.env.PGHOST ?? 'localhost',
  port: Number(process.env.PGPORT ?? 5432),
  user: process.env.PGUSER ?? 'cambasket',
  database: process.env.PGDATABASE ?? 'cambasket',
  password: process.env.PGPASSWORD,
});

async function filas(sql: string, valores: unknown[] = []): Promise<Record<string, unknown>[]> {
  return (await cliente.query(sql, valores)).rows;
}

await cliente.connect();
try {
  const [usuario] = await filas('SELECT id, nombre FROM usuarios WHERE correo = $1', [correo]);
  if (!usuario) throw new Error(`No hay ningún usuario de Cambasket con el correo ${correo}`);

  const baskets = await filas(
    `SELECT b.* FROM baskets b JOIN usuarios_baskets ub ON ub.id_basket = b.id
     WHERE ub.id_usuario = $1 AND ub.estado = 1 ORDER BY b.id`,
    [usuario.id],
  );
  const idsBaskets = baskets.map((b) => b.id);
  // Los catálogos de una basket son los de su dueño (quien la creó).
  const duenios = [...new Set([usuario.id, ...baskets.map((b) => b.id_usuario_creador)])];

  const productos = await filas('SELECT * FROM productos WHERE id_basket = ANY($1)', [idsBaskets]);
  const idsProductos = productos.map((p) => p.id);
  const mercados = await filas('SELECT * FROM mercados_guardados WHERE id_basket = ANY($1)', [idsBaskets]);
  const planificadores = await filas('SELECT * FROM planificadores WHERE id_basket = ANY($1)', [idsBaskets]);
  const usos = await filas('SELECT * FROM usos WHERE id_planificador = ANY($1)', [planificadores.map((p) => p.id)]);

  const tablas: TablasCambasket = {
    baskets,
    marcas: await filas('SELECT * FROM marcas WHERE id_usuario = ANY($1)', [duenios]),
    unidades_medida: await filas('SELECT * FROM unidades_medida WHERE id_usuario = ANY($1)', [duenios]),
    categorias: await filas('SELECT * FROM categorias WHERE id_usuario = ANY($1)', [duenios]),
    productos_genericos: await filas('SELECT * FROM productos_genericos WHERE id_usuario = ANY($1)', [duenios]),
    productos,
    productos_categorias: await filas('SELECT * FROM productos_categorias WHERE id_producto = ANY($1)', [idsProductos]),
    movimientos_stock: await filas('SELECT * FROM movimientos_stock WHERE id_producto = ANY($1)', [idsProductos]),
    items_lista_compras: await filas('SELECT * FROM items_lista_compras WHERE id_producto = ANY($1)', [idsProductos]),
    mercados_guardados: mercados,
    mercados_guardados_productos: await filas('SELECT * FROM mercados_guardados_productos WHERE id_mercado = ANY($1)', [mercados.map((m) => m.id)]),
    planificadores,
    usos,
    usos_productos: await filas('SELECT * FROM usos_productos WHERE id_uso = ANY($1)', [usos.map((u) => u.id)]),
  };

  const importacion = convertirCambasket(tablas);
  writeFileSync(salida, JSON.stringify(importacion, null, 2));
  console.log(
    `Listo: ${importacion.despensas.length} despensas, ${importacion.articulos.length} productos, ` +
      `${importacion.movimientos.length} movimientos, ${importacion.planes.length} planes y ${importacion.comidas.length} comidas en ${salida}.`,
  );
  console.log('En MerCam: Respaldo → Importar, y elige ese archivo.');
} finally {
  await cliente.end();
}
