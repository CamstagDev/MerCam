import { describe, expect, it } from 'vitest';
import type { Oferta } from '../compartido/tipos.ts';
import { agruparIguales, claveDeProducto } from '../src/logica/comparar.ts';

const oferta = (tiendaId: string, titulo: string, precio: number): Oferta => ({ tiendaId, productoId: 'p', titulo, precio, moneda: '$', origen: 'online', actualizada: '' });

describe('agruparIguales', () => {
  it('reconoce el mismo producto aunque cambien mayúsculas, tildes y signos', () => {
    expect(claveDeProducto('LECHE ALPINA (1100 ML)')).toBe(claveDeProducto('Leche Alpína 1100 ml'));
    expect(claveDeProducto('Leche Alpina 1100 ml')).not.toBe(claveDeProducto('Leche Alpina 200 ml'));
  });

  it('junta los iguales de distintos sitios, con el más barato primero', () => {
    const grupos = agruparIguales(
      [
        oferta('d1', 'Leche Alpina 1100 ml', 4200),
        oferta('exito', 'Leche Klarens 1100 ml', 4300),
        oferta('carulla', 'LECHE ALPINA (1100 ML)', 4500),
        oferta('olimpica', 'Leche Alpina 1100 ml', 4900),
      ].map((o) => ({ oferta: o, tiendas: [] })),
    );
    expect(grupos.map((g) => g.opciones.map((o) => `${o.oferta.tiendaId} ${o.oferta.precio}`))).toEqual([
      ['d1 4200', 'carulla 4500', 'olimpica 4900'],
      ['exito 4300'],
    ]);
  });
});
