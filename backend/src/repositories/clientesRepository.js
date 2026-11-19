import { prisma } from './prisma.js';

const include = {
  usuario: {
    select: {
      id: true,
      nombre: true,
      email: true,
      telefono: true,
      activo: true,
      rol: { select: { nombre: true } },
    },
  },
  sedes: { orderBy: { nombre: 'asc' } },
};
export const listarClientes = async (where, skip, take) => {
  const [data, total] = await Promise.all([prisma.cliente.findMany({ where, skip, take, include, orderBy: { razonSocial: 'asc' } }), prisma.cliente.count({ where })]);
  return { data, total };
};
export const buscarCliente = (id) => prisma.cliente.findUnique({ where: { id }, include });
export const buscarClientePorRuc = (ruc) => prisma.cliente.findUnique({ where: { ruc } });
export const buscarUsuarioPorEmail = (email) => prisma.usuario.findUnique({ where: { email } });
export const rolPorNombre = (nombre) => prisma.rol.findUnique({ where: { nombre } });
export const crearCliente = (data) => prisma.$transaction(async (tx) => {
  const usuario = await tx.usuario.create({ data: data.usuario });
  const cliente = await tx.cliente.create({ data: { usuarioId: usuario.id, razonSocial: data.razonSocial, ruc: data.ruc, activo: data.activo }, include });
  await tx.sede.createMany({ data: data.sedes.map((sede) => ({ ...sede, clienteId: cliente.id })) });
  return tx.cliente.findUnique({ where: { id: cliente.id }, include });
});
export const actualizarCliente = (id, data) => prisma.$transaction(async (tx) => {
  if (data.usuario) await tx.usuario.update({ where: { id: data.usuario.id }, data: data.usuario.data });
  await tx.cliente.update({ where: { id }, data: data.cliente });
  if (data.sedes) { await tx.sede.deleteMany({ where: { clienteId: id } }); await tx.sede.createMany({ data: data.sedes.map((sede) => ({ ...sede, clienteId: id })) }); }
  return tx.cliente.findUnique({ where: { id }, include });
});
export const eliminarCliente = (id) => prisma.$transaction(async (tx) => {
  const cliente = await tx.cliente.findUnique({ where: { id }, select: { usuarioId: true } });
  if (!cliente) return;
  await tx.cliente.delete({ where: { id } });
  await tx.usuario.delete({ where: { id: cliente.usuarioId } });
});
export const contarSedes = (id) => prisma.sede.count({ where: { clienteId: id } });
