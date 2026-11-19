import { prisma } from './prisma.js';

const authSelect = {
  id: true,
  nombre: true,
  email: true,
  telefono: true,
  passwordHash: true,
  activo: true,
  debeCambiarPassword: true,
  rol: { select: { nombre: true } },
  cliente: { select: { id: true, activo: true } },
  tecnico: { select: { id: true } },
};

export const buscarUsuarioPorEmail = (email) => prisma.usuario.findUnique({ where: { email }, select: authSelect });
export const buscarUsuario = (id) => prisma.usuario.findUnique({ where: { id }, select: authSelect });
export const hayAdministrador = () => prisma.usuario.count({ where: { rol: { nombre: 'admin' } } })
  .then((count) => count > 0);

export const crearAdministradorInicial = (data) => prisma.$transaction(async (tx) => {
  // Serializa el primer arranque para que solicitudes concurrentes no creen dos administradores.
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(701202611)::text AS lock_acquired`;

  const roles = ['admin', 'coordinador', 'tecnico', 'cliente'];
  for (const nombre of roles) {
    await tx.rol.upsert({ where: { nombre }, update: {}, create: { nombre } });
  }

  const rol = await tx.rol.findUniqueOrThrow({ where: { nombre: 'admin' } });
  if (await tx.usuario.count({ where: { rolId: rol.id } })) return null;

  return tx.usuario.create({
    data: { ...data, rolId: rol.id },
    select: authSelect,
  });
});

export const actualizarUsuario = (id, data) => prisma.$transaction(async (tx) => {
  if (data.passwordHash || data.activo === false) {
    await tx.passwordReset.updateMany({ where: { usuarioId: id, usado: false }, data: { usado: true } });
  }
  return tx.usuario.update({ where: { id }, data, select: authSelect });
});

export const crearTokenRestablecimiento = (usuarioId, tokenHash, expiraAt) => prisma.$transaction(async (tx) => {
  await tx.passwordReset.updateMany({ where: { usuarioId, usado: false }, data: { usado: true } });
  return tx.passwordReset.create({ data: { usuarioId, tokenHash, expiraAt } });
});

export const consumirTokenRestablecimiento = (tokenHash, passwordHash, ahora) => prisma.$transaction(async (tx) => {
  const reset = await tx.passwordReset.findUnique({
    where: { tokenHash },
    select: { id: true, usuarioId: true, usado: true, expiraAt: true },
  });
  if (!reset || reset.usado || reset.expiraAt <= ahora) return false;

  const consumo = await tx.passwordReset.updateMany({
    where: { id: reset.id, usado: false, expiraAt: { gt: ahora } },
    data: { usado: true },
  });
  // Solo una solicitud concurrente puede marcar el token como usado.
  if (consumo.count !== 1) return false;

  await tx.passwordReset.updateMany({ where: { usuarioId: reset.usuarioId, usado: false }, data: { usado: true } });
  await tx.usuario.update({
    where: { id: reset.usuarioId },
    data: { passwordHash, debeCambiarPassword: false },
  });
  return true;
});
