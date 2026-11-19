// Busca los productos de una lista en las tiendas online elegidas. Se
// llama cada vez que el usuario busca su lista: así los precios (y los
// descuentos de ese día) siempre están al día.

import type { Oferta, PedidoBusqueda, RespuestaBusqueda } from '../compartido/tipos.ts';
import { buscadorPorId } from './buscadores/registro.ts';
import { entorno } from './red.ts';
import type { ResultadoBuscador } from './buscadores/buscador.ts';

export const MONEDA = entorno('MERCAM_MONEDA') ?? '$';

/** Con marca se busca "producto marca" y también solo "producto". */
export function textosABuscar(nombre: string, marca?: string): string[] {
  const limpio = nombre.trim();
  return marca?.trim() ? [`${limpio} ${marca.trim()}`, limpio] : [limpio];
}

function sinRepetir(resultados: ResultadoBuscador[]): ResultadoBuscador[] {
  const vistos = new Set<string>();
  return resultados.filter((r) => {
    const clave = r.url ?? `${r.titulo}|${r.precio}`;
    if (vistos.has(clave)) return false;
    vistos.add(clave);
    return true;
  });
}

export async function buscarLista(pedido: PedidoBusqueda): Promise<RespuestaBusqueda> {
  const ofertas: Oferta[] = [];
  const errores: RespuestaBusqueda['errores'] = [];
  const ahora = new Date().toISOString();

  // Una tienda a la vez (sus productos en paralelo), para no saturar a nadie.
  for (const tienda of pedido.tiendas) {
    const online = tienda.online;
    const buscador = online ? buscadorPorId(online.adaptador) : undefined;
    if (!online || !buscador) {
      errores.push({ tiendaId: tienda.id, motivo: 'La tienda no tiene un buscador online' });
      continue;
    }
    try {
      const porProducto = await Promise.all(
        pedido.productos.map(async (producto) => {
          const textos = textosABuscar(producto.nombre, producto.marca);
          const listas = await Promise.all(textos.map((t) => buscador.buscar(online, t)));
          return sinRepetir(listas.flat()).map(
            (r): Oferta => ({
              tiendaId: tienda.id,
              productoId: producto.id,
              titulo: r.titulo,
              marca: r.marca,
              precio: r.precio,
              precioLista: r.precioLista,
              moneda: MONEDA,
              url: r.url,
              origen: 'online',
              actualizada: ahora,
            }),
          );
        }),
      );
      ofertas.push(...porProducto.flat());
    } catch (error) {
      errores.push({ tiendaId: tienda.id, motivo: error instanceof Error ? error.message : String(error) });
    }
  }
  return { ofertas, errores };
}
