import { prisma } from './prisma.js';

const modelos = { especialidades: 'especialidad', categorias: 'categoria', prioridades: 'prioridad' };
export const catalogoModel = (recurso) => prisma[modelos[recurso]];

export async function listarCatalogo(recurso, where, skip, take) {
  const model = catalogoModel(recurso);
  const include = recurso === 'categorias' ? { especialidad: true } : undefined;
  const [data, total] = await Promise.all([model.findMany({ where, skip, take, include, orderBy: { nombre: 'asc' } }), model.count({ where })]);
  return { data, total };
}

export const buscarCatalogo = (recurso, id) => catalogoModel(recurso).findUnique({ where: { id }, include: recurso === 'categorias' ? { especialidad: true } : undefined });
export const crearCatalogo = (recurso, data) => catalogoModel(recurso).create({ data, include: recurso === 'categorias' ? { especialidad: true } : undefined });
export const actualizarCatalogo = (recurso, id, data) => catalogoModel(recurso).update({ where: { id }, data, include: recurso === 'categorias' ? { especialidad: true } : undefined });
export const eliminarCatalogo = (recurso, id) => catalogoModel(recurso).delete({ where: { id } });

export const especialidadExiste = (id) => prisma.especialidad.findUnique({ where: { id } });
export const contarUsoCatalogo = async (recurso, id) => {
  if (recurso === 'especialidades') {
    const [categorias, tecnicos] = await Promise.all([
      prisma.categoria.count({ where: { especialidadId: id } }),
      prisma.tecnicoEspecialidad.count({ where: { especialidadId: id } }),
    ]);
    return categorias + tecnicos;
  }
  return 0;
};
