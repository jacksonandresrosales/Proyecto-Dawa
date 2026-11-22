import { AppError } from '../utils/AppError.js';
import { paginar } from '../utils/paginacion.js';
import * as repository from '../repositories/solicitudesRepository.js';
import { calcularFechaLimite, estadoPlazo } from './sla.js';
import { TRANSICIONES, avisosDeCambio } from './transiciones.js';
import { emitir } from './notificador.js';

const DIA = 24 * 60 * 60 * 1000;
const noEncontrada = () => new AppError(404, 'NO_ENCONTRADO', 'Solicitud no encontrada');
const invalido = (code, campo, mensaje) => new AppError(422, code, mensaje, [{ campo, mensaje }]);

// Regla 3 (y lectura de la 2): el técnico ve las asignadas a él; el cliente, las de su organización.
// `?? 0` evita que un perfil faltante se convierta en "sin filtro".
export function alcance(usuario) {
  if (usuario.rol === 'tecnico') return { tecnicoActualId: usuario.tecnicoId ?? 0 };
  if (usuario.rol === 'cliente') return { clienteId: usuario.clienteId ?? 0 };
  return {};
}

export const presentar = (s, ahora = new Date()) => ({
  id: s.id,
  codigo: s.codigo,
  estado: s.estado.codigo,
  prioridad: s.prioridad.nombre,
  prioridadId: s.prioridad.id,
  categoria: { id: s.categoria.id, nombre: s.categoria.nombre },
  cliente: { id: s.cliente.id, razonSocial: s.cliente.razonSocial },
  sede: s.sede,
  tecnico: s.tecnicoActual ? { id: s.tecnicoActual.id, nombre: s.tecnicoActual.usuario.nombre } : null,
  equipo: s.equipo,
  descripcion: s.descripcion,
  resolucion: s.resolucion,
  fechaLimite: s.fechaLimite,
  estadoPlazo: estadoPlazo({ estado: s.estado.codigo, createdAt: s.createdAt, fechaLimite: s.fechaLimite, resolvedAt: s.resolvedAt }, ahora),
  createdAt: s.createdAt,
  resolvedAt: s.resolvedAt,
  closedAt: s.closedAt,
  version: s.version,
});

export const filtros = (q) => ({
  ...(q.estado ? { estado: { codigo: q.estado } } : {}),
  ...(q.prioridad ? { prioridadId: Number(q.prioridad) } : {}),
  ...(q.categoria ? { categoriaId: Number(q.categoria) } : {}),
  ...(q.cliente ? { clienteId: Number(q.cliente) } : {}),
  ...(q.tecnico ? { tecnicoActualId: Number(q.tecnico) } : {}),
  // shortcut: días en UTC; si el docente pide hora de Ecuador, desplazar 5 h aquí.
  ...(q.desde || q.hasta ? { createdAt: {
    ...(q.desde ? { gte: new Date(q.desde) } : {}),
    ...(q.hasta ? { lt: new Date(new Date(q.hasta).getTime() + DIA) } : {}),
  } } : {}),
  ...(q.q ? { OR: ['codigo', 'equipo', 'descripcion'].map((campo) => ({ [campo]: { contains: q.q, mode: 'insensitive' } })) } : {}),
});

export async function buscarVisible(id, usuario) {
  const solicitud = await repository.buscarSolicitud({ AND: [{ id }, alcance(usuario)] });
  if (!solicitud) throw noEncontrada();
  return solicitud;
}

export async function listar(query, usuario) {
  const pagination = paginar(query);
  // AND: un filtro ?cliente= no puede ampliar el alcance del rol.
  const result = await repository.listarSolicitudes({ AND: [filtros(query), alcance(usuario)] }, pagination.skip, pagination.take);
  const ahora = new Date();
  return { data: result.data.map((s) => presentar(s, ahora)), meta: { page: pagination.page, limit: pagination.limit, total: result.total } };
}

export const obtener = async (id, usuario) => presentar(await buscarVisible(id, usuario));

export async function historial(id, usuario) {
  await buscarVisible(id, usuario);
  return (await repository.listarHistorial(id)).map((h) => ({
    id: h.id,
    estadoAnterior: h.estadoAnterior?.codigo ?? null,
    estadoNuevo: h.estadoNuevo.codigo,
    usuario: h.usuario.nombre,
    comentario: h.comentario,
    fecha: h.createdAt,
  }));
}

export async function crear(values, usuario) {
  const clienteId = usuario.rol === 'cliente' ? usuario.clienteId : values.clienteId;
  if (!clienteId) throw invalido('VALIDACION', 'clienteId', 'Es obligatorio');
  const [sede, categoria, prioridad] = await Promise.all([
    repository.buscarSede(values.sedeId),
    repository.buscarCategoria(values.categoriaId),
    repository.buscarPrioridad(values.prioridadId),
  ]);
  if (!sede || sede.clienteId !== clienteId || !sede.activo) throw invalido('SEDE_INVALIDA', 'sedeId', 'La sede no pertenece al cliente o no está vigente');
  if (!sede.cliente.activo) throw invalido('CLIENTE_INACTIVO', 'clienteId', 'El cliente no está activo');
  if (!categoria?.activo) throw invalido('CATEGORIA_INVALIDA', 'categoriaId', 'La categoría no existe o no está vigente');
  if (!prioridad?.activo) throw invalido('PRIORIDAD_INVALIDA', 'prioridadId', 'La prioridad no existe o no está vigente');

  const ahora = new Date();
  const coordinadores = await repository.idsCoordinadores();
  const solicitud = await repository.crearSolicitud({
    datos: {
      clienteId,
      sedeId: sede.id,
      categoriaId: categoria.id,
      prioridadId: prioridad.id,
      creadoPor: usuario.id,
      equipo: values.equipo,
      descripcion: values.descripcion,
      createdAt: ahora,
      fechaLimite: calcularFechaLimite(ahora, prioridad.horasSla), // regla 6: el plazo lo fija el backend
    },
    notificar: coordinadores,
  });
  emitir(coordinadores.map((usuarioId) => ({ usuarioId, tipo: 'registro', mensaje: `Nueva solicitud ${solicitud.codigo}` })), solicitud.id);
  return presentar(solicitud, ahora);
}

export async function cambiarEstado(id, values, usuario) {
  const solicitud = await buscarVisible(id, usuario);
  const anterior = solicitud.estado.codigo;
  const nuevo = values.estado;
  const regla = TRANSICIONES[anterior]?.[nuevo];
  if (!regla) throw new AppError(409, 'TRANSICION_INVALIDA', `No se puede pasar de ${anterior} a ${nuevo}`);
  if (!regla.roles.includes(usuario.rol)) throw new AppError(403, 'SIN_PERMISO', 'Tu rol no puede hacer este cambio de estado');
  // Regla 2: un técnico solo modifica las solicitudes asignadas a él.
  if (usuario.rol === 'tecnico' && solicitud.tecnicoActualId !== usuario.tecnicoId) {
    throw new AppError(403, 'SIN_PERMISO', 'La solicitud no está asignada a ti');
  }
  if (regla.comentario && !values.comentario) throw invalido('COMENTARIO_REQUERIDO', 'comentario', 'Este cambio de estado requiere un comentario');
  if (regla.resolucion && !values.resolucion) throw invalido('RESOLUCION_REQUERIDA', 'resolucion', 'Debes documentar la resolución');
  // Regla 1: no se cierra sin resolución documentada.
  if (nuevo === 'cerrada' && !solicitud.resolucion?.trim()) throw invalido('RESOLUCION_REQUERIDA', 'resolucion', 'No se puede cerrar sin resolución documentada');

  const ahora = new Date();
  const cambios = {};
  if (nuevo === 'resuelta') Object.assign(cambios, { resolucion: values.resolucion, resolvedAt: ahora });
  if (nuevo === 'cerrada') cambios.closedAt = ahora;
  if (nuevo === 'en_proceso' && ['resuelta', 'cerrada'].includes(anterior)) Object.assign(cambios, { resolvedAt: null, closedAt: null });

  const destinos = { cliente: [solicitud.cliente.usuarioId], tecnico: solicitud.tecnicoActual ? [solicitud.tecnicoActual.usuarioId] : [] };
  const pares = avisosDeCambio(anterior, nuevo);
  if (pares.some(([quien]) => quien === 'coordinadores')) destinos.coordinadores = await repository.idsCoordinadores();
  const mensaje = `Solicitud ${solicitud.codigo}: ${nuevo.replace('_', ' ')}`;
  const avisos = pares.flatMap(([quien, tipo]) => destinos[quien]
    .filter((usuarioId) => usuarioId !== usuario.id)
    .map((usuarioId) => ({ usuarioId, tipo, mensaje })));

  const actualizada = await repository.cambiarEstado({
    id, version: values.version, anterior, nuevo, cambios, usuarioId: usuario.id,
    comentario: values.comentario ?? values.resolucion ?? null, avisos,
  });
  // Regla 8: la versión enviada debe coincidir con la guardada.
  if (!actualizada) throw new AppError(409, 'CONFLICTO_VERSION', 'Otra persona modificó la solicitud; recárgala e inténtalo de nuevo');
  emitir(avisos, id);
  return presentar(actualizada, ahora);
}
