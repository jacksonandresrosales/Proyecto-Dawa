import { AppError } from '../utils/AppError.js';
import { paginar } from '../utils/paginacion.js';
import * as repository from '../repositories/notificacionesRepository.js';

// Cada usuario solo ve y marca sus propias notificaciones.
export async function listar(query, usuario) {
  const pagination = paginar(query);
  const where = { usuarioId: usuario.id, ...(query.leida ? { leida: query.leida === 'true' } : {}) };
  const result = await repository.listarNotificaciones(where, pagination.skip, pagination.take);
  return { data: result.data, meta: { page: pagination.page, limit: pagination.limit, total: result.total, noLeidas: result.noLeidas } };
}

export async function marcarLeida(id, usuario) {
  if (!await repository.marcarLeida(id, usuario.id)) throw new AppError(404, 'NO_ENCONTRADO', 'Notificación no encontrada');
}

export const marcarTodas = async (usuario) => ({ actualizadas: await repository.marcarTodas(usuario.id) });
