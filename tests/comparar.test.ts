import { describe, expect, it } from 'vitest';
import type { Eleccion, Oferta, Producto, Tienda } from '../compartido/tipos.ts';
import { armarMinilista, claveManual, exactitud, ofertasVisibles, ordenarOfertas } from '../src/logica/comparar.ts';

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
    // Dentro de la marca, primero la que dice "entera" como el producto.
    expect(ordenadas.map((o) => o.precio)).toEqual([250, 200, 100]);
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

describe('precios manuales por palabras', () => {
  const manual = (titulo: string) => oferta({ titulo, productoId: claveManual(titulo), origen: 'manual' });

  it('un precio manual sirve si su título trae todas las palabras del producto', () => {
    const ordenadas = ordenarOfertas(leche, [
      manual('Leche entera de Toro 1 L'),
      manual('LECHE ENTERA'),
      manual('Leche deslactosada Toro 1 L'),
      manual('Queso entero'),
    ]);
    expect(ordenadas.map((o) => o.titulo)).toEqual(['Leche entera de Toro 1 L', 'LECHE ENTERA']);
  });

  it('las ofertas online siguen siendo solo de su producto', () => {
    expect(ordenarOfertas(leche, [oferta({ titulo: 'Leche entera', productoId: 'otro' })])).toEqual([]);
  });
});

describe('orden por exactitud', () => {
  it('primero lo que más se parece a lo buscado y después el precio', () => {
    const ordenadas = ordenarOfertas({ id: 'p1', nombre: 'Leche', cantidad: 1 }, [
      oferta({ precio: 1500, titulo: 'Chocolatina JET de leche' }),
      oferta({ precio: 4200, titulo: 'Leche entera Alpina 1100 ml' }),
      oferta({ precio: 3900, titulo: 'Leche deslactosada Colanta 1 L' }),
      oferta({ precio: 2500, titulo: 'Arequipe con leche' }),
    ]);
    expect(ordenadas.map((o) => o.titulo)).toEqual([
      'Leche deslactosada Colanta 1 L',
      'Leche entera Alpina 1100 ml',
      'Chocolatina JET de leche',
      'Arequipe con leche',
    ]);
  });

  it('con varias palabras, primero las que las traen todas', () => {
    const ordenadas = ordenarOfertas(leche, [
      oferta({ precio: 3900, titulo: 'Leche deslactosada 1 L' }),
      oferta({ precio: 4200, titulo: 'LECHE ENTERA Alpina' }),
      oferta({ precio: 1500, titulo: 'Chocolatina leche entera' }),
    ]);
    expect(ordenadas.map((o) => o.precio)).toEqual([4200, 3900, 1500]);
  });

  it('reconoce plurales', () => {
    expect(exactitud('Huevos AA x 30', 'huevo')).toBe(3);
  });
});
