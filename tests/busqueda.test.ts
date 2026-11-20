import { describe, expect, it, vi } from 'vitest';

const buscar = vi.fn(async (_online: unknown, texto: string) => [{ titulo: `${texto} (1000 ml)`, precio: 100, url: `https://x/${texto}` }]);
vi.mock('../servidor/buscadores/registro.ts', () => ({ buscadorPorId: () => ({ id: 'vtex', buscar }) }));

const { buscarLista } = await import('../servidor/busqueda.ts');

describe('buscarLista', () => {
  it('las sedes que comparten tienda online se buscan una sola vez', async () => {
    const online = { url: 'https://www.carulla.com', adaptador: 'vtex' };
    const { ofertas, errores } = await buscarLista({
      tiendas: [
        { id: 'a', nombre: 'Carulla Pance', online },
        { id: 'b', nombre: 'Carulla', online },
      ],
      productos: [{ id: 'p', nombre: 'Leche' }],
    });
    expect(buscar).toHaveBeenCalledTimes(1);
    expect(errores).toEqual([]);
    expect(ofertas.map((o) => o.tiendaId)).toEqual(['a', 'b']);
  });
});
