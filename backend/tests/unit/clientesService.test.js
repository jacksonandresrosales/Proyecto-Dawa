import { beforeEach, describe, expect, it, vi } from 'vitest';

const repository = {
  buscarUsuarioPorEmail: vi.fn(),
  buscarClientePorRuc: vi.fn(),
  buscarCliente: vi.fn(),
  contarSedes: vi.fn(),
  eliminarCliente: vi.fn(),
  rolPorNombre: vi.fn(),
};
vi.mock('../../src/repositories/clientesRepository.js', () => repository);
const service = await import('../../src/services/clientesService.js');

beforeEach(() => vi.clearAllMocks());

describe('clientesService', () => {
  it('rechaza correos duplicados sin intentar crear el cliente', async () => {
    repository.buscarUsuarioPorEmail.mockResolvedValue({ id: 3 });

    await expect(service.crear({
      nombre: 'Ana',
      email: 'ANA@example.com',
      password: 'secreto123',
      razonSocial: 'Empresa',
      ruc: '1234567890123',
      sedes: [{ nombre: 'Matriz', direccion: 'Centro' }],
    })).rejects.toMatchObject({ status: 409, code: 'DUPLICADO' });
    expect(repository.buscarUsuarioPorEmail).toHaveBeenCalledWith('ana@example.com');
  });

  it('rechaza RUC duplicados', async () => {
    repository.buscarUsuarioPorEmail.mockResolvedValue(null);
    repository.buscarClientePorRuc.mockResolvedValue({ id: 4 });

    await expect(service.crear({
      nombre: 'Ana',
      email: 'ana@example.com',
      password: 'secreto123',
      razonSocial: 'Empresa',
      ruc: '1234567890123',
      sedes: [{ nombre: 'Matriz', direccion: 'Centro' }],
    })).rejects.toMatchObject({ status: 409, code: 'DUPLICADO' });
  });

  it('bloquea la eliminación física de clientes con sedes relacionadas', async () => {
    repository.buscarCliente.mockResolvedValue({ id: 4 });
    repository.contarSedes.mockResolvedValue(1);

    await expect(service.eliminar(4)).rejects.toMatchObject({ status: 409, code: 'EN_USO' });
    expect(repository.eliminarCliente).not.toHaveBeenCalled();
  });
});
