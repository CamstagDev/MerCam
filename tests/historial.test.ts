import { describe, expect, it } from 'vitest';
import type { SeriePrecio } from '../compartido/tipos.ts';
import { PUNTOS_POR_SERIE, analizarOferta, analizarPrecio, anotarPrecio, claveSerie, podarHistorial, seriesDelProducto } from '../src/logica/historial.ts';

const visto = { producto: 'Leche', titulo: 'Leche Alquería 1 L', tienda: 'Éxito', tiendaId: 't1', moneda: '$', origen: 'online' as const };

describe('anotarPrecio', () => {
  it('un punto por día: el último del día reemplaza al anterior', () => {
    const h: Record<string, SeriePrecio> = {};
    anotarPrecio(h, { ...visto, precio: 4000, fecha: new Date(2026, 10, 1, 9) });
    anotarPrecio(h, { ...visto, precio: 3800, fecha: new Date(2026, 10, 1, 18) });
    anotarPrecio(h, { ...visto, precio: 4100, fecha: new Date(2026, 10, 2) });
    const serie = h[claveSerie('t1', 'Leche Alquería 1 L')]!;
    expect(serie.puntos).toEqual([
      { dia: '2026-11-01', precio: 3800 },
      { dia: '2026-11-02', precio: 4100 },
    ]);
    expect(serie.producto).toBe('leche');
  });

  it('guarda como mucho PUNTOS_POR_SERIE puntos e ignora precios en cero', () => {
    const h: Record<string, SeriePrecio> = {};
    for (let i = 0; i < PUNTOS_POR_SERIE + 10; i++) anotarPrecio(h, { ...visto, precio: 1000 + i, fecha: new Date(2026, 0, 1 + i) });
    anotarPrecio(h, { ...visto, precio: 0 });
    const serie = Object.values(h)[0]!;
    expect(serie.puntos).toHaveLength(PUNTOS_POR_SERIE);
    expect(serie.puntos[0]!.precio).toBe(1010);
  });
});

describe('analizarPrecio', () => {
  const puntos = [
    { dia: '2026-11-01', precio: 4000 },
    { dia: '2026-11-02', precio: 4200 },
    { dia: '2026-11-03', precio: 3800 },
  ];
  const hoy = '2026-11-10';

  it('sin días anteriores es "nuevo" (el punto de hoy no cuenta)', () => {
    expect(analizarPrecio([{ dia: hoy, precio: 100 }], 100, hoy).veredicto).toBe('nuevo');
  });
  it('detecta el mínimo histórico', () => {
    const a = analizarPrecio(puntos, 3500, hoy);
    expect(a.veredicto).toBe('minimo');
    expect(a.promedio).toBe(4000);
    expect(a.dias).toBe(3);
  });
  it('oferta: 7 % o más por debajo del promedio sin ser el mínimo', () => {
    expect(analizarPrecio([...puntos, { dia: '2026-11-04', precio: 3000 }], 3400, hoy).veredicto).toBe('oferta');
  });
  it('caro y normal', () => {
    expect(analizarPrecio(puntos, 4300, hoy).veredicto).toBe('caro');
    expect(analizarPrecio(puntos, 4050, hoy).veredicto).toBe('normal');
  });
  it('analizarOferta busca la serie de esa tienda y título', () => {
    const h: Record<string, SeriePrecio> = {};
    anotarPrecio(h, { ...visto, precio: 5000, fecha: new Date(2026, 10, 1) });
    expect(analizarOferta(h, 't1', 'leche alqueria 1 l', 4000, hoy).veredicto).toBe('minimo');
    expect(analizarOferta(h, 't2', 'Leche Alquería 1 L', 4000, hoy).veredicto).toBe('nuevo');
  });
});

describe('podar y buscar series', () => {
  it('deja las series vistas más recientemente', () => {
    const h: Record<string, SeriePrecio> = {};
    anotarPrecio(h, { ...visto, titulo: 'A', precio: 1, fecha: new Date(2026, 0, 1) });
    anotarPrecio(h, { ...visto, titulo: 'B', precio: 1, fecha: new Date(2026, 5, 1) });
    expect(Object.values(podarHistorial(h, 1)).map((s) => s.titulo)).toEqual(['B']);
  });
  it('seriesDelProducto junta todas las tiendas por nombre de producto', () => {
    const h: Record<string, SeriePrecio> = {};
    anotarPrecio(h, { ...visto, precio: 1 });
    anotarPrecio(h, { ...visto, tiendaId: 't2', tienda: 'D1', precio: 2 });
    anotarPrecio(h, { ...visto, producto: 'Pan', titulo: 'Pan', precio: 3 });
    expect(seriesDelProducto(h, 'LECHE')).toHaveLength(2);
  });
});
