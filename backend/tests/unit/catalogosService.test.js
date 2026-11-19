import { beforeEach, describe, expect, it, vi } from 'vitest';

const repository = {
  catalogoModel: vi.fn(), buscarCatalogo: vi.fn(), especialidadExiste: vi.fn(), crearCatalogo: vi.fn(), actualizarCatalogo: vi.fn(), contarUsoCatalogo: vi.fn(), eliminarCatalogo: vi.fn(), listarCatalogo: vi.fn(),
};
vi.mock('../../src/repositories/catalogosRepository.js', () => repository);
const service = await import('../../src/services/catalogosService.js');

beforeEach(() => vi.clearAllMocks());

describe('catalogosService', () => {
  it('rechaza una categoría cuya especialidad no existe o está inactiva', async () => {
    repository.especialidadExiste.mockResolvedValue({ id: 4, activo: false });
    await expect(service.crear('categorias', { nombre: 'Redes', especialidadId: 4 })).rejects.toMatchObject({ status: 422, code: 'ESPECIALIDAD_INVALIDA' });
  });

  it('reporta duplicidad de nombre como conflicto', async () => {
    repository.especialidadExiste.mockResolvedValue({ id: 2, activo: true });
    repository.catalogoModel.mockReturnValue({ findFirst: vi.fn().mockResolvedValue({ id: 8 }) });
    await expect(service.crear('categorias', { nombre: 'Redes', especialidadId: 2 })).rejects.toMatchObject({ status: 409, code: 'DUPLICADO' });
  });

  it('busca nombres sin distinguir mayúsculas al actualizar', async () => {
    repository.buscarCatalogo.mockResolvedValue({ id: 3, nombre: 'Redes' });
    const findFirst = vi.fn().mockResolvedValue({ id: 8 });
    repository.catalogoModel.mockReturnValue({ findFirst });

    await expect(service.actualizar('especialidades', 3, { nombre: 'REDES' }))
      .rejects.toMatchObject({ status: 409, code: 'DUPLICADO' });
    expect(findFirst).toHaveBeenCalledWith({
      where: { nombre: { equals: 'REDES', mode: 'insensitive' }, id: { not: 3 } },
    });
  });

  it('impide eliminar un catálogo que está en uso', async () => {
    repository.buscarCatalogo.mockResolvedValue({ id: 1 });
    repository.contarUsoCatalogo.mockResolvedValue(2);
    await expect(service.eliminar('especialidades', 1)).rejects.toMatchObject({ status: 409, code: 'EN_USO' });
    expect(repository.eliminarCatalogo).not.toHaveBeenCalled();
  });
});
