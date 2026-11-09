import { describe, expect, it } from 'vitest';
import { leerProductosVtex } from '../servidor/buscadores/vtex.ts';
import { textosABuscar } from '../servidor/busqueda.ts';
import { consultaOverpass, leerElementos } from '../servidor/mapeo/supermercados.ts';
import { CADENAS, cadenaDeTienda, validarCadena } from '../servidor/cadenas/cadenas.ts';

describe('VTEX', () => {
  it('toma el precio más bajo disponible y omite los sin stock', () => {
    const resultados = leerProductosVtex([
      {
        productName: 'Leche Entera 1 L',
        brand: 'Colun',
        link: 'https://tienda.test/leche/p',
        items: [
          { sellers: [{ commertialOffer: { Price: 1200, ListPrice: 1500, IsAvailable: true } }] },
          { sellers: [{ commertialOffer: { Price: 1100, ListPrice: 1100, IsAvailable: true } }] },
        ],
      },
      { productName: 'Sin stock', items: [{ sellers: [{ commertialOffer: { Price: 10, IsAvailable: false } }] }] },
    ]);
    expect(resultados).toEqual([
      { titulo: 'Leche Entera 1 L', marca: 'Colun', precio: 1100, precioLista: undefined, url: 'https://tienda.test/leche/p' },
    ]);
  });
});

describe('cadenas (servidor/cadenas/*.json)', () => {
  it('carga todos los archivos', () => {
    expect(CADENAS.map((c) => c.id)).toEqual(
      expect.arrayContaining(['exito', 'carulla', 'olimpica', 'jumbo', 'd1', 'mercamio', 'superinter']),
    );
  });

  it('reconoce las cadenas por nombre o marca', () => {
    expect(cadenaDeTienda(undefined, 'Éxito Express Ciudad Jardín')?.tiendaOnline?.url).toBe('https://www.exito.com');
    expect(cadenaDeTienda('Olímpica')?.tiendaOnline?.url).toBe('https://www.olimpica.com');
    expect(cadenaDeTienda('Tiendas D1')?.id).toBe('d1');
    expect(cadenaDeTienda('Metro')?.id).toBe('jumbo');
    expect(cadenaDeTienda('Metropolitana')).toBeUndefined();
  });

  it('sabe qué cadenas no venden online', () => {
    expect(cadenaDeTienda('Súper Inter Guadalupe')?.tiendaOnline).toBeNull();
  });

  it('avisa qué está mal en un archivo', () => {
    expect(() => validarCadena({ id: 'otra', nombre: 'X', alias: ['x'], tiendaOnline: null }, 'x.json')).toThrow('x.json');
    expect(() => validarCadena({ id: 'x', nombre: 'X', alias: ['x'], tiendaOnline: { url: '' } }, 'x.json')).toThrow('tiendaOnline');
  });
});

describe('búsqueda', () => {
  it('con marca busca con y sin la marca', () => {
    expect(textosABuscar(' Leche ', 'Colun')).toEqual(['Leche Colun', 'Leche']);
    expect(textosABuscar('Leche')).toEqual(['Leche']);
  });
});

describe('Overpass', () => {
  it('arma la consulta con el radio y las coordenadas', () => {
    expect(consultaOverpass({ lat: -33.4, lon: -70.6 }, 1500)).toContain('around:1500,-33.4,-70.6');
  });

  it('lee nodos y edificios, y salta los sin nombre', () => {
    const tiendas = leerElementos([
      { type: 'node', id: 1, lat: 1, lon: 2, tags: { name: 'Súper Centro', brand: 'Cadena', website: 'https://cadena.test', 'addr:street': 'Calle', 'addr:housenumber': '12' } },
      { type: 'way', id: 2, center: { lat: 3, lon: 4 }, tags: { brand: 'Otra' } },
      { type: 'node', id: 3, lat: 0, lon: 0, tags: {} },
    ]);
    expect(tiendas).toHaveLength(2);
    expect(tiendas[0]).toMatchObject({ nombre: 'Súper Centro', direccion: 'Calle 12', osmId: 'node/1', sitioWeb: 'https://cadena.test' });
    expect(tiendas[1]).toMatchObject({ nombre: 'Otra', coordenadas: { lat: 3, lon: 4 } });
  });
});
