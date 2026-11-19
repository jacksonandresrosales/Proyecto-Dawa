import { beforeEach, describe, expect, it, vi } from 'vitest';

const tecnicosRepository = { especialidadesActivas: vi.fn(), buscarTecnico: vi.fn(), listarTecnicos: vi.fn(), crearTecnico: vi.fn(), actualizarTecnico: vi.fn(), contarEspecialidades: vi.fn(), eliminarTecnico: vi.fn() };
const clientesRepository = { buscarUsuarioPorEmail: vi.fn(), rolPorNombre: vi.fn() };
vi.mock('../../src/repositories/tecnicosRepository.js', () => tecnicosRepository);
vi.mock('../../src/repositories/clientesRepository.js', () => clientesRepository);
const service = await import('../../src/services/tecnicosService.js');

beforeEach(() => vi.clearAllMocks());

describe('tecnicosService', () => {
  it('rechaza especialidades repetidas antes de crear el técnico', async () => {
    clientesRepository.buscarUsuarioPorEmail.mockResolvedValue(null);
    await expect(service.crear({ nombre: 'Ana', email: 'ana@servigest.ec', password: 'secreto123', especialidadIds: [1, 1] })).rejects.toMatchObject({ status: 422, code: 'ESPECIALIDADES_DUPLICADAS' });
  });

  it('rechaza especialidades que no existen o no están activas', async () => {
    clientesRepository.buscarUsuarioPorEmail.mockResolvedValue(null);
    tecnicosRepository.especialidadesActivas.mockResolvedValue([{ id: 1 }]);
    await expect(service.crear({ nombre: 'Ana', email: 'ana@servigest.ec', password: 'secreto123', especialidadIds: [1, 2] })).rejects.toMatchObject({ status: 422, code: 'ESPECIALIDAD_INVALIDA' });
  });

  it('rechaza correos duplicados', async () => {
    clientesRepository.buscarUsuarioPorEmail.mockResolvedValue({ id: 7 });

    await expect(service.crear({ nombre: 'Ana', email: 'ana@servigest.ec', password: 'secreto123', especialidadIds: [1] }))
      .rejects.toMatchObject({ status: 409, code: 'DUPLICADO' });
    expect(tecnicosRepository.especialidadesActivas).not.toHaveBeenCalled();
  });

  it('bloquea la eliminación física de técnicos vinculados a especialidades', async () => {
    tecnicosRepository.buscarTecnico.mockResolvedValue({ id: 2 });
    tecnicosRepository.contarEspecialidades.mockResolvedValue(1);

    await expect(service.eliminar(2)).rejects.toMatchObject({ status: 409, code: 'EN_USO' });
    expect(tecnicosRepository.eliminarTecnico).not.toHaveBeenCalled();
  });
});
