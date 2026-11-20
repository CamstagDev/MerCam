import { describe, expect, it } from 'vitest';
import type { Oferta, Tienda } from '../compartido/tipos.ts';
import { migrar } from '../src/datos/almacen.ts';
import { agruparRepetidas } from '../src/logica/comparar.ts';
import { medidaDeContenido, medidaDeTitulo, precioDeReferencia, reconocerUnidad } from '../src/logica/medidas.ts';

describe('medidas', () => {
  it('reconoce unidades por su nombre', () => {
    expect(reconocerUnidad('Litros')).toEqual({ base: 'ml', factor: 1000 });
    expect(reconocerUnidad('kg')).toEqual({ base: 'g', factor: 1000 });
    expect(reconocerUnidad('Paquete')).toBeUndefined();
  });

  it('lee el tamaño del título', () => {
    expect(medidaDeTitulo('Leche FRESCAMPO entera UHT bolsa maxilitro (1100 ml)')).toEqual({ base: 'ml', cantidad: 1100 });
    expect(medidaDeTitulo('Aceite 1,5 L')).toEqual({ base: 'ml', cantidad: 1500 });
    expect(medidaDeTitulo('Arroz Diana 500 g x 6')).toEqual({ base: 'g', cantidad: 3000 });
    expect(medidaDeTitulo('Atún en lata 2 kg')).toEqual({ base: 'g', cantidad: 2000 });
    expect(medidaDeTitulo('Huevos AA')).toBeUndefined();
  });

  it('precio por litro y contenido pedido', () => {
    expect(precioDeReferencia(3770, { base: 'ml', cantidad: 1100 })).toBeCloseTo(3427.27, 1);
    expect(medidaDeContenido(1, { id: 'l', nombre: 'L', activo: true })).toEqual({ base: 'ml', cantidad: 1000 });
  });

  it('las unidades viejas sin equivalencia la deducen del nombre', () => {
    const d = migrar({ unidades: [{ id: 'x', nombre: 'Litros', activo: true }, { id: 'y', nombre: 'Bolsa', activo: true }] });
    expect(d.unidades[0]).toMatchObject({ base: 'ml', factor: 1000 });
    expect(d.unidades[1]!.base).toBeUndefined();
  });
});

describe('agruparRepetidas', () => {
  const carulla = (id: string, nombre: string): Tienda => ({
    id,
    sitioId: 's',
    nombre,
    cadena: 'Carulla',
    origen: 'mapeada',
    online: { url: 'https://www.carulla.com', adaptador: 'vtex' },
  });
  const tiendas = [carulla('a', 'Carulla Pance'), carulla('b', 'Carulla'), { id: 'c', sitioId: 's', nombre: 'D1', origen: 'mapeada' as const }];
  const oferta = (tiendaId: string, titulo: string, precio: number): Oferta => ({ tiendaId, productoId: 'p', titulo, precio, moneda: '$', origen: 'online', actualizada: '' });

  it('junta mismo título y precio en la misma cadena, y guarda todas sus tiendas', () => {
    const grupos = agruparRepetidas(
      [
        oferta('a', 'Leche FRESCAMPO (1100 ml)', 3770),
        oferta('b', 'Leche Frescampo (1100 ml)', 3770),
        oferta('c', 'Leche FRESCAMPO (1100 ml)', 3770),
        oferta('b', 'Leche KLARENS (1100 ml)', 5450),
        oferta('a', 'Leche KLARENS (1100 ml)', 5600),
      ],
      tiendas,
    );
    expect(grupos.map((g) => [g.oferta.titulo, g.tiendas.map((t) => t.nombre)])).toEqual([
      ['Leche FRESCAMPO (1100 ml)', ['Carulla Pance', 'Carulla']],
      ['Leche FRESCAMPO (1100 ml)', ['D1']],
      ['Leche KLARENS (1100 ml)', ['Carulla']],
      ['Leche KLARENS (1100 ml)', ['Carulla Pance']],
    ]);
  });
});
