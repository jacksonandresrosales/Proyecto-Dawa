import { prisma } from './prisma.js';

const selectUsuario = {
  id: true,
  nombre: true,
  email: true,
  telefono: true,
  activo: true,
  debeCambiarPassword: true,
  createdAt: true,
  rol: { select: { nombre: true } },
  cliente: { select: { id: true } },
  tecnico: { select: { id: true } },
};

export async function listarUsuarios(where, skip, take) {
  const [data, total] = await Promise.all([
    prisma.usuario.findMany({ where, skip, take, select: selectUsuario, orderBy: { email: 'asc' } }),
    prisma.usuario.count({ where }),
  ]);
  return { data, total };
}

export const buscarUsuario = (id) => prisma.usuario.findUnique({ where: { id }, select: selectUsuario });
export const buscarUsuarioPorEmail = (email) => prisma.usuario.findUnique({ where: { email }, select: { id: true } });
export const rolPorNombre = (nombre) => prisma.rol.findUnique({ where: { nombre }, select: { id: true, nombre: true } });
export const crearUsuario = (data) => prisma.usuario.create({ data, select: selectUsuario });
export const actualizarUsuario = (id, data) => prisma.$transaction(async (tx) => {
  if (data.activo === false) {
    await tx.passwordReset.updateMany({ where: { usuarioId: id, usado: false }, data: { usado: true } });
  }
  return tx.usuario.update({ where: { id }, data, select: selectUsuario });
});
export const contarAdministradoresActivos = () => prisma.usuario.count({
  where: { activo: true, rol: { nombre: 'admin' } },
});

export const restablecerPasswordTemporal = (id, passwordHash) => prisma.$transaction(async (tx) => {
  await tx.passwordReset.updateMany({ where: { usuarioId: id, usado: false }, data: { usado: true } });
  return tx.usuario.update({
    where: { id },
    data: { passwordHash, debeCambiarPassword: true },
    select: selectUsuario,
  });
});
