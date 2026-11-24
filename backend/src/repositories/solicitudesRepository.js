import { prisma } from './prisma.js';

const include = {
  estado: { select: { codigo: true } },
  prioridad: { select: { id: true, nombre: true } },
  categoria: { select: { id: true, nombre: true, especialidadId: true } },
  cliente: { select: { id: true, razonSocial: true, usuarioId: true } },
  sede: { select: { id: true, nombre: true } },
  tecnicoActual: { select: { id: true, usuarioId: true, usuario: { select: { nombre: true } } } },
};

const idEstado = async (tx, codigo) => (await tx.estado.findUniqueOrThrow({ where: { codigo }, select: { id: true } })).id;

// El update condicionado a la versión responde P2025 si otra persona ya cambió la solicitud.
async function conVersion(trabajo) {
  try {
    return await prisma.$transaction(trabajo);
  } catch (error) {
    if (error.code === 'P2025') return null;
    throw error;
  }
}

export const listarSolicitudes = async (where, skip, take) => {
  const [data, total] = await Promise.all([
    prisma.solicitud.findMany({ where, skip, take, include, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] }),
    prisma.solicitud.count({ where }),
  ]);
  return { data, total };
};
export const listarSolicitudesParaFiltro = (where) => prisma.solicitud.findMany({
  where,
  include,
  orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
});
export const buscarSolicitud = (where) => prisma.solicitud.findFirst({ where, include });
export const listarHistorial = (solicitudId) => prisma.historialEstado.findMany({
  where: { solicitudId },
  orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  include: { estadoAnterior: { select: { codigo: true } }, estadoNuevo: { select: { codigo: true } }, usuario: { select: { nombre: true } } },
});
export const buscarSede = (id) => prisma.sede.findUnique({ where: { id }, include: { cliente: { select: { activo: true } } } });
export const buscarCategoria = (id) => prisma.categoria.findUnique({ where: { id } });
export const buscarPrioridad = (id) => prisma.prioridad.findUnique({ where: { id } });
export const buscarTecnico = (id) => prisma.tecnico.findUnique({
  where: { id },
  include: { usuario: { select: { nombre: true, activo: true } }, especialidades: { select: { especialidadId: true } } },
});
export const contarActivas = (tecnicoId, estados) => prisma.solicitud.count({ where: { tecnicoActualId: tecnicoId, estado: { codigo: { in: estados } } } });
export const idsCoordinadores = async () => (await prisma.usuario.findMany({
  where: { activo: true, rol: { nombre: 'coordinador' } },
  select: { id: true },
})).map((usuario) => usuario.id);

export const crearSolicitud = ({ datos, notificar }) => prisma.$transaction(async (tx) => {
  // El id sale de la secuencia antes del insert para formar un código único sin carreras.
  const [{ id }] = await tx.$queryRaw`SELECT nextval('solicitudes_id_seq')::int AS id`;
  const codigo = `SOL-${datos.createdAt.getFullYear()}-${String(id).padStart(6, '0')}`;
  const estadoId = await idEstado(tx, 'registrada');
  await tx.solicitud.create({ data: { ...datos, id, codigo, estadoId } });
  await tx.historialEstado.create({ data: { solicitudId: id, estadoNuevoId: estadoId, usuarioId: datos.creadoPor, createdAt: datos.createdAt } });
  if (notificar.length) {
    await tx.notificacion.createMany({ data: notificar.map((usuarioId) => ({ usuarioId, solicitudId: id, tipo: 'registro', mensaje: `Nueva solicitud ${codigo}` })) });
  }
  return tx.solicitud.findUnique({ where: { id }, include });
});

export const cambiarEstado = ({ id, version, anterior, nuevo, cambios, usuarioId, comentario, avisos }) => conVersion(async (tx) => {
  const estadoAnteriorId = await idEstado(tx, anterior);
  const estadoNuevoId = await idEstado(tx, nuevo);
  await tx.solicitud.update({ where: { id, version }, data: { ...cambios, estadoId: estadoNuevoId, version: { increment: 1 } } });
  await tx.historialEstado.create({ data: { solicitudId: id, estadoAnteriorId, estadoNuevoId, usuarioId, comentario } });
  if (avisos.length) await tx.notificacion.createMany({ data: avisos.map((aviso) => ({ ...aviso, solicitudId: id })) });
  return tx.solicitud.findUnique({ where: { id }, include });
});

export const asignar = ({ id, version, tecnicoId, usuarioId, justificacion, cambiaEstado, comentario, avisos }) => conVersion(async (tx) => {
  const data = { tecnicoActualId: tecnicoId, version: { increment: 1 } };
  const [aprobadaId, asignadaId] = cambiaEstado ? [await idEstado(tx, 'aprobada'), await idEstado(tx, 'asignada')] : [];
  if (cambiaEstado) data.estadoId = asignadaId;
  await tx.solicitud.update({ where: { id, version }, data });
  await tx.asignacion.updateMany({ where: { solicitudId: id, activa: true }, data: { activa: false } });
  await tx.asignacion.create({ data: { solicitudId: id, tecnicoId, asignadoPor: usuarioId, justificacion } });
  // Una reasignación no cambia el estado: queda auditada en asignaciones, no en historial_estados.
  if (cambiaEstado) {
    await tx.historialEstado.create({ data: { solicitudId: id, estadoAnteriorId: aprobadaId, estadoNuevoId: asignadaId, usuarioId, comentario } });
  }
  if (avisos.length) await tx.notificacion.createMany({ data: avisos.map((aviso) => ({ ...aviso, solicitudId: id })) });
  return tx.solicitud.findUnique({ where: { id }, include });
});

export const listarAdjuntos = (solicitudId) => prisma.adjunto.findMany({
  where: { solicitudId },
  orderBy: { createdAt: 'asc' },
  include: { usuario: { select: { nombre: true } } },
});
export const contarAdjuntos = (solicitudId) => prisma.adjunto.count({ where: { solicitudId } });
export const crearAdjunto = (data) => prisma.adjunto.create({ data, include: { usuario: { select: { nombre: true } } } });
export const buscarAdjunto = (id, solicitudId) => prisma.adjunto.findFirst({ where: { id, solicitudId } });
