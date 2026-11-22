// Única fuente de verdad de la máquina de estados (docs/tecnico/03-estados-y-reglas.md).
// aprobada → asignada no está aquí: solo ocurre con POST /solicitudes/:id/asignaciones.
export const TRANSICIONES = {
  registrada: {
    aprobada: { roles: ['coordinador'] },
    cancelada: { roles: ['coordinador', 'cliente'], comentario: true },
  },
  aprobada: {
    cancelada: { roles: ['coordinador', 'cliente'], comentario: true },
  },
  asignada: {
    en_proceso: { roles: ['tecnico'] },
  },
  en_proceso: {
    pendiente_info: { roles: ['tecnico'], comentario: true },
    resuelta: { roles: ['tecnico'], resolucion: true },
  },
  pendiente_info: {
    en_proceso: { roles: ['cliente', 'coordinador'], comentario: true },
  },
  resuelta: {
    cerrada: { roles: ['coordinador'] },
    en_proceso: { roles: ['coordinador'], comentario: true },
  },
  cerrada: {
    en_proceso: { roles: ['coordinador', 'admin'], comentario: true }, // reapertura (regla 4)
  },
};

export const ESTADOS_ACTIVOS = ['asignada', 'en_proceso', 'pendiente_info'];

// Quién recibe aviso de cada cambio (tabla "Eventos que generan notificación").
export function avisosDeCambio(anterior, nuevo) {
  if (nuevo === 'aprobada' || nuevo === 'cancelada') return [['cliente', 'cambio_estado']];
  if (nuevo === 'pendiente_info') return [['cliente', 'solicitud_info']];
  if (nuevo === 'resuelta') return [['cliente', 'cambio_estado'], ['coordinadores', 'cambio_estado']];
  if (nuevo === 'cerrada') return [['cliente', 'cierre'], ['tecnico', 'cierre']];
  if (anterior === 'cerrada') return [['cliente', 'cambio_estado'], ['tecnico', 'cambio_estado']];
  if (anterior === 'pendiente_info' || anterior === 'resuelta') return [['tecnico', 'cambio_estado']];
  return [];
}
