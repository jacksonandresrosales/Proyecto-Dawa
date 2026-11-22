// Reglas de plazo (docs/tecnico/03-estados-y-reglas.md, regla 6). Funciones puras.
const HORA = 60 * 60 * 1000;

export const calcularFechaLimite = (creada, horasSla) => new Date(creada.getTime() + horasSla * HORA);

export function estadoPlazo({ estado, createdAt, fechaLimite, resolvedAt }, ahora = new Date()) {
  if (estado === 'cancelada') return null; // las canceladas no cuentan para el cumplimiento
  if (resolvedAt) return resolvedAt <= fechaLimite ? 'cumplida' : 'incumplida';
  if (ahora > fechaLimite) return 'vencida';
  const restante = fechaLimite - ahora;
  return restante < (fechaLimite - createdAt) * 0.2 ? 'por_vencer' : 'a_tiempo';
}
