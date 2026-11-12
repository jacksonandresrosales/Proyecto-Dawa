const LIMITE_MAX = 100;

// Convierte ?page y ?limit en valores seguros para Prisma (skip/take).
export function paginar(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(LIMITE_MAX, Math.max(1, parseInt(query.limit, 10) || 10));
  return { page, limit, skip: (page - 1) * limit, take: limit };
}
