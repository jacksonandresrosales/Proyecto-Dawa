import { prisma } from './prisma.js';

const select = { id: true, tipo: true, mensaje: true, leida: true, solicitudId: true, createdAt: true };

export const listarNotificaciones = async (where, skip, take) => {
  const [data, total, noLeidas] = await Promise.all([
    prisma.notificacion.findMany({ where, skip, take, select, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] }),
    prisma.notificacion.count({ where }),
    prisma.notificacion.count({ where: { usuarioId: where.usuarioId, leida: false } }),
  ]);
  return { data, total, noLeidas };
};
// El filtro por usuario hace que una notificación ajena cuente como inexistente.
export const marcarLeida = async (id, usuarioId) => (await prisma.notificacion.updateMany({ where: { id, usuarioId }, data: { leida: true } })).count;
export const marcarTodas = async (usuarioId) => (await prisma.notificacion.updateMany({ where: { usuarioId, leida: false }, data: { leida: true } })).count;
