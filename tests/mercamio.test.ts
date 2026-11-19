import { describe, expect, it } from 'vitest';
import { distanciaM, leerProductosMercamio, leerSedes } from '../servidor/buscadores/mercamio.ts';
import '../servidor/cadenas/disco.ts';

const calle5 = { lat: 3.4059529, lon: -76.5467996 };

describe('Mercamio', () => {
  it('toma las sedes activas dentro del radio (coordenadas en orden lat, lon)', () => {
    const sedes = leerSedes(
      [
        { id: 'a', name: 'Calle 5', address: 'Calle 5 #50-103', geopoint: { coordinates: [3.4059529, -76.5467996] } },
        { id: 'b', name: 'Plaza norte', geopoint: { coordinates: [3.4778, -76.5163] } },
        { id: 'c', name: 'Cerrada', inactive: true, geopoint: { coordinates: [3.406, -76.547] } },
      ],
      { lat: 3.41, lon: -76.545 },
      2000,
      'https://mercamio.com',
    );
    expect(sedes.map((s) => s.nombre)).toEqual(['Mercamio Calle 5']);
    expect(sedes[0]?.online).toEqual({ url: 'https://mercamio.com', adaptador: 'mercamio', sede: 'a' });
  });

  it('lee el precio de la sede elegida y omite los sin stock', () => {
    const resultados = leerProductosMercamio(
      [
        {
          id: 'p1',
          title: 'Papel Higienico Elite x12',
          brand: 'ELITE',
          stock_branch_offices: [
            { id: 'a', price: 14590, price_neto: 11950, discount: 2640, stock: 10 },
            { id: 'b', price: 11950, price_neto: 11950, stock: 10 },
          ],
        },
        { id: 'p2', title: 'Agotado', stock_branch_offices: [{ id: 'a', price: 5000, price_neto: 5000, stock: 0 }] },
        { id: 'p3', title: 'Solo en otra sede', stock_branch_offices: [{ id: 'b', price: 5000, stock: 3 }] },
      ],
      'a',
      'https://mercamio.com',
    );
    expect(resultados).toEqual([
      { titulo: 'Papel Higienico Elite x12', marca: 'ELITE', precio: 11950, precioLista: 14590, url: 'https://mercamio.com/product/p1' },
    ]);
  });

  it('mide distancias en metros', () => {
    expect(Math.round(distanciaM(calle5, { lat: 3.4064842, lon: -76.5468023 }))).toBe(59);
  });
});
