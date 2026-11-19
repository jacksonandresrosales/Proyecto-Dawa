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
  especialidades: { include: { especialidad: true } },
};
export const listarTecnicos = async (where, skip, take) => {
  const [data, total] = await Promise.all([prisma.tecnico.findMany({ where, skip, take, include, orderBy: { usuario: { nombre: 'asc' } } }), prisma.tecnico.count({ where })]);
  return { data, total };
};
export const buscarTecnico = (id) => prisma.tecnico.findUnique({ where: { id }, include });
export const crearTecnico = (data) => prisma.$transaction(async (tx) => {
  const usuario = await tx.usuario.create({ data: data.usuario });
  return tx.tecnico.create({ data: { usuarioId: usuario.id, disponible: data.disponible, cargaMax: data.cargaMax, especialidades: { create: data.especialidadIds.map((especialidadId) => ({ especialidadId })) } }, include });
});
export const actualizarTecnico = (id, data) => prisma.$transaction(async (tx) => {
  if (data.usuario) await tx.usuario.update({ where: { id: data.usuario.id }, data: data.usuario.data });
  await tx.tecnico.update({ where: { id }, data: data.tecnico });
  if (data.especialidadIds) { await tx.tecnicoEspecialidad.deleteMany({ where: { tecnicoId: id } }); await tx.tecnicoEspecialidad.createMany({ data: data.especialidadIds.map((especialidadId) => ({ tecnicoId: id, especialidadId })) }); }
  return tx.tecnico.findUnique({ where: { id }, include });
});
export const eliminarTecnico = (id) => prisma.$transaction(async (tx) => {
  const tecnico = await tx.tecnico.findUnique({ where: { id }, select: { usuarioId: true } });
  if (!tecnico) return;
  await tx.tecnico.delete({ where: { id } });
  await tx.usuario.delete({ where: { id: tecnico.usuarioId } });
});
export const contarEspecialidades = (id) => prisma.tecnicoEspecialidad.count({ where: { tecnicoId: id } });
export const especialidadesActivas = (ids) => prisma.especialidad.findMany({ where: { id: { in: ids }, activo: true }, select: { id: true } });
