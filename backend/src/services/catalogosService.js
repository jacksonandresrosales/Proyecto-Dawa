import { AppError } from '../utils/AppError.js';
import * as repository from '../repositories/catalogosRepository.js';
import { paginar } from '../utils/paginacion.js';

const etiqueta = { especialidades: 'especialidad', categorias: 'categoría', prioridades: 'prioridad' };
const normalizar = (data) => ({ ...data, ...(data.nombre ? { nombre: data.nombre.trim() } : {}) });
const whereLista = (query) => ({ ...(query.activo === undefined ? {} : { activo: query.activo === 'true' }), ...(query.q ? { nombre: { contains: query.q, mode: 'insensitive' } } : {}) });

export async function listar(recurso, query) {
  const pagination = paginar(query);
  const result = await repository.listarCatalogo(recurso, whereLista(query), pagination.skip, pagination.take);
  return { ...result, meta: { page: pagination.page, limit: pagination.limit, total: result.total } };
}
export async function obtener(recurso, id) {
  const item = await repository.buscarCatalogo(recurso, id);
  if (!item) throw new AppError(404, 'NO_ENCONTRADO', `${etiqueta[recurso]} no encontrada`);
  return item;
}
export async function crear(recurso, values) {
  const data = normalizar(values);
  if (recurso === 'categorias') await validarEspecialidad(data.especialidadId);
  const existente = await buscarPorNombre(recurso, data.nombre);
  if (existente) throw duplicado('nombre', `Ya existe esa ${etiqueta[recurso]}`);
  return repository.crearCatalogo(recurso, data);
}
export async function actualizar(recurso, id, values) {
  await obtener(recurso, id);
  const data = normalizar(values);
  if (recurso === 'categorias' && data.especialidadId) await validarEspecialidad(data.especialidadId);
  if (data.nombre) {
    const existente = await buscarPorNombre(recurso, data.nombre, id);
    if (existente) throw duplicado('nombre', `Ya existe esa ${etiqueta[recurso]}`);
  }
  return repository.actualizarCatalogo(recurso, id, data);
}
export async function eliminar(recurso, id) {
  await obtener(recurso, id);
  if (await repository.contarUsoCatalogo(recurso, id)) throw new AppError(409, 'EN_USO', 'El registro tiene relaciones y solo puede desactivarse');
  return repository.eliminarCatalogo(recurso, id);
}
async function validarEspecialidad(id) {
  const especialidad = await repository.especialidadExiste(id);
  if (!especialidad || !especialidad.activo) throw new AppError(422, 'ESPECIALIDAD_INVALIDA', 'La especialidad no existe o está inactiva');
}
function buscarPorNombre(recurso, nombre, excluirId) {
  return repository.catalogoModel(recurso).findFirst({
    where: {
      nombre: { equals: nombre, mode: 'insensitive' },
      ...(excluirId === undefined ? {} : { id: { not: excluirId } }),
    },
  });
}
const duplicado = (campo, mensaje) => new AppError(409, 'DUPLICADO', mensaje, [{ campo, mensaje }]);
