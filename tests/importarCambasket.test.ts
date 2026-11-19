import { describe, expect, it } from 'vitest';
import { datosVacios } from '../src/datos/almacen.ts';
import { estadoArticulo } from '../src/logica/despensa.ts';
import { convertirCambasket, sumarImportacion, type TablasCambasket } from '../src/logica/importarCambasket.ts';

const tablas: TablasCambasket = {
  baskets: [{ id: 1, nombre: 'Casa', descripcion: null, id_usuario_creador: 7, fecha_creacion: new Date('2026-01-01') }],
  marcas: [{ id: 3, id_usuario: 7, nombre: 'Diana', descripcion: null, estado: 1 }],
  unidades_medida: [{ id: 4, id_usuario: 7, nombre: 'Paquete', estado: 1 }],
  categorias: [{ id: 5, id_usuario: 7, nombre: 'Granos', estado: 0 }],
  productos_genericos: [{ id: 9, id_usuario: 7, nombre: 'Arroz' }],
  productos: [{ id: 10, id_basket: 1, nombre: 'Arroz Diana 500 g', descripcion: '', id_unidad_medida: 4, id_marca: 3, id_generico: 9, stock_actual: '2.000' }],
  productos_categorias: [{ id_producto: 10, id_categoria: 5 }],
  movimientos_stock: [
    { id: 20, id_producto: 10, id_usuario: 7, tipo: 1, cantidad: '3.000', precio_total: '7500.00', fecha: new Date('2026-02-01'), estado: 1 },
    { id: 21, id_producto: 10, id_usuario: 7, tipo: 2, cantidad: '1.000', precio_total: null, fecha: new Date('2026-02-02'), estado: 1 },
  ],
  items_lista_compras: [{ id: 30, id_producto: 10, cantidad: '2', precio_estimado: '5000' }],
  mercados_guardados: [{ id: 40, id_basket: 1, nombre: 'Mes', fecha_creacion: new Date('2026-01-02') }],
  mercados_guardados_productos: [{ id_mercado: 40, id_producto: 10 }],
  planificadores: [{ id: 50, id_basket: 1, nombre: 'Semana' }],
  usos: [{ id: 60, id_planificador: 50, nombre: 'Almuerzo', fecha: new Date('2026-02-03T00:00:00Z'), estado: 1, fecha_ejecucion: new Date('2026-02-02') }],
  usos_productos: [{ id: 70, id_uso: 60, id_producto: 10, cantidad: '1', id_movimiento_stock: 21 }],
};

describe('importar Cambasket', () => {
  const imp = convertirCambasket(tablas, new Date('2026-11-19'));

  it('convierte baskets, productos, catálogos y movimientos', () => {
    expect(imp.despensas).toEqual([expect.objectContaining({ id: 'cb-basket-1', nombre: 'Casa' })]);
    expect(imp.articulos[0]).toMatchObject({ nombre: 'Arroz Diana 500 g', generico: 'Arroz', unidadId: 'cb-unidad-4', marcaId: 'cb-marca-3', categoriaIds: ['cb-categoria-5'] });
    expect(imp.categorias[0]!.activo).toBe(false);
    expect(imp.movimientos.map((m) => [m.tipo, m.cantidad, m.precioTotal])).toEqual([['compra', 3, 7500], ['consumo', 1, undefined]]);
    expect(imp.movimientos[1]!.comidaId).toBe('cb-uso-60');
  });

  it('la lista de compras, los mercados y los planes', () => {
    expect(imp.listas[0]).toMatchObject({ nombre: 'Compras · Casa', productos: [{ cantidad: 2, precioEstimado: 5000, marca: 'Diana', articuloId: 'cb-producto-10' }] });
    expect(imp.mercados[0]!.articuloIds).toEqual(['cb-producto-10']);
    expect(imp.comidas[0]).toMatchObject({ planId: 'cb-plan-50', fecha: '2026-02-03', lineas: [{ cantidad: 1 }] });
    expect(imp.comidas[0]!.ejecutada).toBeTruthy();
  });

  it('el stock queda igual que en Cambasket y reimportar no duplica', () => {
    const d = datosVacios();
    sumarImportacion(d, imp);
    sumarImportacion(d, imp);
    expect(d.articulos).toHaveLength(1);
    expect(d.unidades.length).toBeGreaterThan(1);
    expect(estadoArticulo(d, 'cb-producto-10')).toMatchObject({ stock: 2, separado: 0, precioPromedio: 2500 });
  });
});
