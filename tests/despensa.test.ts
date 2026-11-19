import { describe, expect, it } from 'vitest';
import type { Movimiento } from '../compartido/tipos.ts';
import { datosVacios, migrar, type Datos } from '../src/datos/almacen.ts';
import {
  agregarArticulosALista,
  calcularStock,
  deshacerComida,
  ejecutarComida,
  estadoArticulo,
  faltantesDePlan,
  marcarComprados,
  precioPromedio,
  registrarCompra,
} from '../src/logica/despensa.ts';
import { claveSerie } from '../src/logica/historial.ts';

let contador = 0;
const id = () => `id${++contador}`;

function mov(parcial: Partial<Movimiento>): Movimiento {
  return { id: id(), articuloId: 'arroz', tipo: 'compra', cantidad: 1, fecha: '2026-11-01T10:00:00.000Z', activo: true, ...parcial };
}

function datosDePrueba(): Datos {
  const d = datosVacios();
  d.despensas.push({ id: 'casa', nombre: 'Casa', creada: '' });
  d.marcas.push({ id: 'diana', nombre: 'Diana', activo: true });
  d.articulos.push(
    { id: 'arroz', despensaId: 'casa', nombre: 'Arroz Diana 500 g', generico: 'Arroz', unidadId: 'u6', marcaId: 'diana', categoriaIds: [], creado: '' },
    { id: 'huevo', despensaId: 'casa', nombre: 'Huevos AA', generico: 'Huevo', unidadId: 'u1', categoriaIds: [], creado: '' },
  );
  d.planes.push({ id: 'semana', despensaId: 'casa', nombre: 'Semana', creado: '' });
  d.comidas.push({
    id: 'almuerzo',
    planId: 'semana',
    nombre: 'Arroz con huevo',
    lineas: [
      { id: 'l1', articuloId: 'arroz', cantidad: 1 },
      { id: 'l2', articuloId: 'huevo', cantidad: 4 },
    ],
    creada: '',
  });
  return d;
}

describe('stock y precio promedio', () => {
  it('reproduce los movimientos activos en orden y nunca baja de cero', () => {
    const movimientos = [
      mov({ cantidad: 2, fecha: '2026-11-01' }),
      mov({ tipo: 'consumo', cantidad: 5, fecha: '2026-11-02' }),
      mov({ cantidad: 1.5, fecha: '2026-11-03' }),
      mov({ cantidad: 10, fecha: '2026-11-04', activo: false }),
    ];
    expect(calcularStock(movimientos)).toBe(1.5);
  });

  it('el promedio pondera por cantidad y redondea hacia arriba', () => {
    expect(precioPromedio([mov({ cantidad: 1, precioTotal: 1000 }), mov({ cantidad: 3, precioTotal: 2001 })])).toBe(751);
    expect(precioPromedio([mov({ tipo: 'consumo' })])).toBeUndefined();
  });
});

describe('comidas', () => {
  it('lo de las comidas pendientes queda separado', () => {
    const d = datosDePrueba();
    d.movimientos.push(mov({ cantidad: 3 }));
    expect(estadoArticulo(d, 'arroz')).toMatchObject({ stock: 3, separado: 1, disponible: 2 });
    expect(estadoArticulo(d, 'huevo')).toMatchObject({ stock: 0, separado: 4, disponible: -4 });
  });

  it('no se ejecuta si falta stock, y dice qué falta', () => {
    const d = datosDePrueba();
    d.movimientos.push(mov({ cantidad: 3 }));
    const faltan = ejecutarComida(d, 'almuerzo', id);
    expect(faltan).toEqual([{ articuloId: 'huevo', nombre: 'Huevos AA', necesario: 4, disponible: 0 }]);
    expect(d.comidas[0]!.ejecutada).toBeUndefined();
    expect(d.movimientos).toHaveLength(1);
  });

  it('ejecutar descuenta del stock y deshacer lo devuelve', () => {
    const d = datosDePrueba();
    d.movimientos.push(mov({ cantidad: 3 }), mov({ articuloId: 'huevo', cantidad: 12 }));
    expect(ejecutarComida(d, 'almuerzo', id, new Date('2026-11-05T12:00:00Z'))).toEqual([]);
    expect(estadoArticulo(d, 'huevo')).toMatchObject({ stock: 8, separado: 0 });
    deshacerComida(d, 'almuerzo');
    expect(estadoArticulo(d, 'huevo')).toMatchObject({ stock: 12, separado: 4 });
    expect(d.comidas[0]!.ejecutada).toBeUndefined();
  });

  it('faltantes del plan: solo lo que el stock no cubre', () => {
    const d = datosDePrueba();
    d.movimientos.push(mov({ cantidad: 3 }), mov({ articuloId: 'huevo', cantidad: 1 }));
    expect(faltantesDePlan(d, 'semana')).toEqual([{ articuloId: 'huevo', cantidad: 3 }]);
  });
});

describe('listas y compras', () => {
  it('agrega artículos a una lista sumando si ya estaban', () => {
    const d = datosDePrueba();
    d.listas.push({ id: 'l', nombre: 'Semana', productos: [], creada: '' });
    expect(agregarArticulosALista(d, 'l', [{ articuloId: 'arroz', cantidad: 2 }], id)).toBe(1);
    expect(agregarArticulosALista(d, 'l', [{ articuloId: 'arroz', cantidad: 1, precioEstimado: 9000 }], id)).toBe(0);
    expect(d.listas[0]!.productos).toEqual([
      expect.objectContaining({ nombre: 'Arroz Diana 500 g', marca: 'Diana', cantidad: 3, articuloId: 'arroz', precioEstimado: 9000 }),
    ]);
  });

  it('marcar comprado usa la oferta elegida, suma stock y anota el precio', () => {
    const d = datosDePrueba();
    d.tiendas.push({ id: 'exito', sitioId: 's', nombre: 'Éxito', origen: 'mapeada' });
    d.listas.push({
      id: 'l',
      nombre: 'Semana',
      creada: '',
      productos: [
        { id: 'p1', nombre: 'Arroz Diana 500 g', cantidad: 2, articuloId: 'arroz' },
        { id: 'p2', nombre: 'Huevos AA', cantidad: 1, articuloId: 'huevo' },
        { id: 'p3', nombre: 'Servilletas', cantidad: 1 },
      ],
    });
    d.elecciones.push({
      listaId: 'l',
      productoId: 'p1',
      oferta: { tiendaId: 'exito', productoId: 'p1', titulo: 'Arroz Diana x 500 g', precio: 2500, moneda: '$', origen: 'online', actualizada: '' },
    });
    const r = marcarComprados(d, 'l', ['p1', 'p2', 'p3'], id, new Date('2026-11-05T12:00:00Z'));
    expect(r.comprados).toEqual(['p1', 'p3']);
    expect(r.errores).toHaveLength(1);
    expect(d.listas[0]!.productos.map((p) => p.id)).toEqual(['p2']);
    expect(d.elecciones).toHaveLength(0);
    expect(d.movimientos).toEqual([expect.objectContaining({ articuloId: 'arroz', tipo: 'compra', cantidad: 2, precioTotal: 5000, tienda: 'Éxito' })]);
    expect(d.historial[claveSerie('exito', 'Arroz Diana x 500 g')]!.puntos[0]!.precio).toBe(2500);
  });

  it('registrar una compra a mano anota el precio unitario', () => {
    const d = datosDePrueba();
    registrarCompra(d, { articuloId: 'huevo', cantidad: 30, precioTotal: 18000, fecha: '2026-11-05T12:00:00Z', tienda: 'Plaza' }, id);
    expect(estadoArticulo(d, 'huevo').stock).toBe(30);
    expect(Object.values(d.historial)[0]).toMatchObject({ tienda: 'Plaza', origen: 'compra', puntos: [{ precio: 600 }] });
  });
});

describe('migrar', () => {
  it('los datos de la versión 1 quedan con despensa vacía y unidades iniciales', () => {
    const d = migrar({ version: 1, listas: [{ id: 'x', nombre: 'Vieja', productos: [], creada: '' }] } as Partial<Datos>);
    expect(d.version).toBe(2);
    expect(d.listas).toHaveLength(1);
    expect(d.despensas).toEqual([]);
    expect(d.unidades.length).toBeGreaterThan(0);
    expect(d.historial).toEqual({});
  });
});
