import { beforeEach, describe, expect, it, vi } from 'vitest';

const repository = {
  buscarSolicitud: vi.fn(),
  cambiarEstado: vi.fn(),
  idsCoordinadores: vi.fn(),
  buscarTecnico: vi.fn(),
  contarActivas: vi.fn(),
  asignar: vi.fn(),
};
vi.mock('../../src/repositories/solicitudesRepository.js', () => repository);
const service = await import('../../src/services/solicitudesService.js');
const asignaciones = await import('../../src/services/asignacionesService.js');

const solicitud = (cambios = {}) => ({
  id: 1,
  codigo: 'SOL-2026-000001',
  version: 3,
  estado: { codigo: 'en_proceso' },
  tecnicoActualId: 7,
  tecnicoActual: { id: 7, usuarioId: 70, usuario: { nombre: 'Técnico' } },
  cliente: { id: 2, razonSocial: 'Cliente', usuarioId: 20 },
  prioridad: { id: 1, nombre: 'Alta' },
  categoria: { id: 4, nombre: 'Redes', especialidadId: 5 },
  sede: { id: 1, nombre: 'Matriz' },
  equipo: 'Router',
  descripcion: 'Sin conexión',
  resolucion: null,
  createdAt: new Date('2026-11-10T08:00:00Z'),
  fechaLimite: new Date('2026-11-10T16:00:00Z'),
  resolvedAt: null,
  closedAt: null,
  ...cambios,
});
const coordinador = { id: 10, rol: 'coordinador' };
const tecnico = (tecnicoId) => ({ id: 70, rol: 'tecnico', tecnicoId });

beforeEach(() => {
  vi.clearAllMocks();
  repository.idsCoordinadores.mockResolvedValue([10]);
  repository.cambiarEstado.mockImplementation(async ({ nuevo }) => solicitud({ estado: { codigo: nuevo }, version: 4 }));
});

describe('cambio de estado', () => {
  it('regla 1: no cierra una solicitud sin resolución documentada', async () => {
    repository.buscarSolicitud.mockResolvedValue(solicitud({ estado: { codigo: 'resuelta' }, resolucion: '  ' }));
    await expect(service.cambiarEstado(1, { estado: 'cerrada', version: 3 }, coordinador))
      .rejects.toMatchObject({ status: 422, code: 'RESOLUCION_REQUERIDA' });
    expect(repository.cambiarEstado).not.toHaveBeenCalled();
  });

  it('regla 1: no marca como resuelta sin resolución', async () => {
    repository.buscarSolicitud.mockResolvedValue(solicitud());
    await expect(service.cambiarEstado(1, { estado: 'resuelta', version: 3 }, tecnico(7)))
      .rejects.toMatchObject({ status: 422, code: 'RESOLUCION_REQUERIDA' });
  });

  it('regla 2: un técnico no modifica solicitudes de otro técnico', async () => {
    repository.buscarSolicitud.mockResolvedValue(solicitud());
    await expect(service.cambiarEstado(1, { estado: 'pendiente_info', comentario: 'Falta dato', version: 3 }, tecnico(99)))
      .rejects.toMatchObject({ status: 403, code: 'SIN_PERMISO' });
    expect(repository.cambiarEstado).not.toHaveBeenCalled();
  });

  it('regla 3: el cliente solo busca dentro de su organización', async () => {
    repository.buscarSolicitud.mockResolvedValue(null);
    await expect(service.obtener(1, { id: 20, rol: 'cliente', clienteId: 2 })).rejects.toMatchObject({ status: 404 });
    expect(repository.buscarSolicitud).toHaveBeenCalledWith({ AND: [{ id: 1 }, { clienteId: 2 }] });
  });

  it('regla 4: una cerrada solo vuelve a en proceso con reapertura autorizada y comentada', async () => {
    repository.buscarSolicitud.mockResolvedValue(solicitud({ estado: { codigo: 'cerrada' }, resolucion: 'Hecho', resolvedAt: new Date() }));
    await expect(service.cambiarEstado(1, { estado: 'registrada', version: 3 }, coordinador))
      .rejects.toMatchObject({ status: 409, code: 'TRANSICION_INVALIDA' });
    await expect(service.cambiarEstado(1, { estado: 'en_proceso', comentario: 'Volvió a fallar', version: 3 }, tecnico(7)))
      .rejects.toMatchObject({ status: 403 });
    await expect(service.cambiarEstado(1, { estado: 'en_proceso', version: 3 }, coordinador))
      .rejects.toMatchObject({ status: 422, code: 'COMENTARIO_REQUERIDO' });

    await service.cambiarEstado(1, { estado: 'en_proceso', comentario: 'Volvió a fallar', version: 3 }, coordinador);
    expect(repository.cambiarEstado).toHaveBeenCalledWith(expect.objectContaining({
      anterior: 'cerrada',
      nuevo: 'en_proceso',
      cambios: { resolvedAt: null, closedAt: null },
      comentario: 'Volvió a fallar',
    }));
  });

  it('regla 8: responde conflicto si otra persona cambió la versión', async () => {
    repository.buscarSolicitud.mockResolvedValue(solicitud({ estado: { codigo: 'registrada' } }));
    repository.cambiarEstado.mockResolvedValue(null);
    await expect(service.cambiarEstado(1, { estado: 'aprobada', version: 2 }, coordinador))
      .rejects.toMatchObject({ status: 409, code: 'CONFLICTO_VERSION' });
  });
});

describe('asignación (regla 5)', () => {
  const aprobada = () => solicitud({ estado: { codigo: 'aprobada' }, tecnicoActualId: null, tecnicoActual: null });
  const tecnicoApto = (cambios = {}) => ({ id: 8, usuarioId: 80, disponible: true, cargaMax: 2, usuario: { nombre: 'Ana', activo: true }, especialidades: [{ especialidadId: 5 }], ...cambios });

  beforeEach(() => {
    repository.buscarSolicitud.mockResolvedValue(aprobada());
    repository.contarActivas.mockResolvedValue(0);
    repository.asignar.mockResolvedValue(solicitud({ estado: { codigo: 'asignada' } }));
  });

  it.each([
    ['TECNICO_SIN_ESPECIALIDAD', tecnicoApto({ especialidades: [{ especialidadId: 9 }] }), 0],
    ['TECNICO_NO_DISPONIBLE', tecnicoApto({ disponible: false }), 0],
    ['TECNICO_CARGA_MAXIMA', tecnicoApto(), 2],
  ])('rechaza con %s', async (code, tecnicoBuscado, activas) => {
    repository.buscarTecnico.mockResolvedValue(tecnicoBuscado);
    repository.contarActivas.mockResolvedValue(activas);
    await expect(asignaciones.asignar(1, { tecnicoId: 8 }, coordinador)).rejects.toMatchObject({ status: 422, code });
    expect(repository.asignar).not.toHaveBeenCalled();
  });

  it('asigna un técnico apto y pasa la solicitud a asignada', async () => {
    repository.buscarTecnico.mockResolvedValue(tecnicoApto());
    const result = await asignaciones.asignar(1, { tecnicoId: 8 }, coordinador);
    expect(result.estado).toBe('asignada');
    expect(repository.asignar).toHaveBeenCalledWith(expect.objectContaining({ tecnicoId: 8, cambiaEstado: true, version: 3 }));
  });

  it('exige justificación para reasignar', async () => {
    repository.buscarSolicitud.mockResolvedValue(solicitud({ estado: { codigo: 'asignada' } }));
    repository.buscarTecnico.mockResolvedValue(tecnicoApto());
    await expect(asignaciones.asignar(1, { tecnicoId: 8 }, coordinador))
      .rejects.toMatchObject({ status: 422, code: 'JUSTIFICACION_REQUERIDA' });
  });
});
