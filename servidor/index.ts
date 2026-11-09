// Servidor de búsqueda de MerCam (Node + Express). La app no puede leer
// las tiendas online directamente (el navegador lo bloquea por CORS y
// algunas tiendas necesitan más que un fetch), así que se lo pide a este
// servidor. No guarda nada: las listas, sitios y precios viven en la app.
//
//   npm run servidor       http://localhost:3010
//
//   GET  /api/salud        para ver que está vivo
//   POST /api/mapear       { direccion, radioM } -> supermercados cercanos
//                          y si venden online. Se usa pocas veces.
//   POST /api/buscar       { tiendas, productos } -> ofertas con precios
//                          de hoy. Se usa cada vez que se busca una lista.

import express from 'express';
import type { PedidoBusqueda, PedidoMapeo, RespuestaMapeo } from '../compartido/tipos.ts';
import { buscarLista } from './busqueda.ts';
import { geocodificar } from './mapeo/geocodificar.ts';
import { buscarSupermercados } from './mapeo/supermercados.ts';
import { detectarTiendaOnline } from './mapeo/tiendaOnline.ts';

const PUERTO = Number(process.env.PORT ?? 3010); // 3003 es SudoCam

const app = express();
app.use(express.json({ limit: '1mb' }));

// La app de Android (Capacitor) llama desde otro origen.
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

app.get('/api/salud', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/mapear', async (req, res) => {
  const { direccion, radioM } = req.body as Partial<PedidoMapeo>;
  if (!direccion || typeof direccion !== 'string') {
    res.status(400).json({ error: 'Falta la dirección' });
    return;
  }
  try {
    const { coordenadas, direccionEncontrada } = await geocodificar(direccion);
    const encontradas = await buscarSupermercados(coordenadas, Math.min(Number(radioM) || 2000, 10000));
    const tiendas: RespuestaMapeo['tiendas'] = [];
    for (const { sitioWeb, ...tienda } of encontradas) {
      tiendas.push({ ...tienda, online: await detectarTiendaOnline({ ...tienda, sitioWeb }) });
    }
    const respuesta: RespuestaMapeo = { coordenadas, direccionEncontrada, tiendas };
    res.json(respuesta);
  } catch (error) {
    console.error(error);
    res.status(502).json({ error: error instanceof Error ? error.message : 'Error al mapear' });
  }
});

app.post('/api/buscar', async (req, res) => {
  const pedido = req.body as Partial<PedidoBusqueda>;
  if (!Array.isArray(pedido.tiendas) || !Array.isArray(pedido.productos)) {
    res.status(400).json({ error: 'Faltan tiendas o productos' });
    return;
  }
  res.json(await buscarLista({ tiendas: pedido.tiendas, productos: pedido.productos }));
});

app.listen(PUERTO, () => {
  console.log(`Servidor de MerCam en http://localhost:${PUERTO}`);
});
