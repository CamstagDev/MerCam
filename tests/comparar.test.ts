import { describe, expect, it } from 'vitest';
import type { Eleccion, Oferta, Producto, Tienda } from '../compartido/tipos.ts';
import { armarMinilista, claveManual, ofertasVisibles, ordenarOfertas } from '../src/logica/comparar.ts';

function oferta(parcial: Partial<Oferta>): Oferta {
  return {
    tiendaId: 't1',
    productoId: 'p1',
    titulo: 'Leche',
    precio: 100,
    moneda: '$',
    origen: 'online',
    actualizada: '2026-11-09T00:00:00.000Z',
    ...parcial,
  };
}

const leche: Producto = { id: 'p1', nombre: 'Leche entera', cantidad: 2 };

describe('ordenarOfertas', () => {
  it('sin marca, de la más barata a la más cara', () => {
    const ordenadas = ordenarOfertas(leche, [oferta({ precio: 300 }), oferta({ precio: 100 }), oferta({ precio: 200 })]);
    expect(ordenadas.map((o) => o.precio)).toEqual([100, 200, 300]);
  });

  it('con marca, primero las de la marca aunque sean más caras', () => {
    const conMarca = { ...leche, marca: 'Colún' };
    const ordenadas = ordenarOfertas(conMarca, [
      oferta({ precio: 100, titulo: 'Leche Soprole' }),
      oferta({ precio: 250, titulo: 'Leche entera', marca: 'Colun' }),
      oferta({ precio: 200, titulo: 'Leche COLÚN 1 L' }),
    ]);
    expect(ordenadas.map((o) => o.precio)).toEqual([200, 250, 100]);
  });

  it('incluye los precios manuales cargados por nombre', () => {
    const ordenadas = ordenarOfertas(leche, [
      oferta({ precio: 150 }),
      oferta({ precio: 90, productoId: claveManual('LECHE ENTERA'), origen: 'manual' }),
      oferta({ precio: 10, productoId: 'otro' }),
    ]);
    expect(ordenadas.map((o) => o.precio)).toEqual([90, 150]);
  });
});

describe('ofertasVisibles', () => {
  const cinco = [1, 2, 3, 4, 5].map((precio) => oferta({ precio }));
  it('muestra 3 y con "Ver más" todas', () => {
    expect(ofertasVisibles(cinco, false)).toHaveLength(3);
    expect(ofertasVisibles(cinco, true)).toHaveLength(5);
  });
});

describe('armarMinilista', () => {
  it('agrupa por tienda y suma precio × cantidad', () => {
    const tiendas: Tienda[] = [
      { id: 't1', sitioId: 's', nombre: 'Súper A', origen: 'mapeada' },
      { id: 't2', sitioId: 's', nombre: 'Almacén', origen: 'manual' },
    ];
    const pan: Producto = { id: 'p2', nombre: 'Pan', cantidad: 1 };
    const elecciones: Eleccion[] = [
      { listaId: 'l', productoId: 'p1', oferta: oferta({ tiendaId: 't1', precio: 100 }) },
      { listaId: 'l', productoId: 'p2', oferta: oferta({ tiendaId: 't2', productoId: 'p2', precio: 50 }) },
    ];
    const grupos = armarMinilista(elecciones, [leche, pan], tiendas);
    expect(grupos.map((g) => [g.tienda.nombre, g.total])).toEqual([
      ['Súper A', 200],
      ['Almacén', 50],
    ]);
  });
});
