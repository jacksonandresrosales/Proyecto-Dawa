import type { UserRole } from '@/auth/AuthContext';
import type { EstadoCodigo, EstadoPlazo, Solicitud } from '@/api/solicitudes';

export type Tono = 'neutral' | 'warning' | 'accent' | 'info' | 'review' | 'success' | 'danger' | 'critical';

// Tonos y nombres de docs/ux/06-sistema-visual.md.
export const ESTADOS: Record<EstadoCodigo, { nombre: string; tono: Tono }> = {
  registrada: { nombre: 'Registrada', tono: 'warning' },
  aprobada: { nombre: 'Aprobada', tono: 'accent' },
  asignada: { nombre: 'Asignada', tono: 'accent' },
  en_proceso: { nombre: 'En proceso', tono: 'info' },
  pendiente_info: { nombre: 'Pendiente de información', tono: 'review' },
  resuelta: { nombre: 'Resuelta', tono: 'success' },
  cerrada: { nombre: 'Cerrada', tono: 'neutral' },
  cancelada: { nombre: 'Cancelada', tono: 'danger' },
};

export const PLAZOS: Record<Exclude<EstadoPlazo, null>, { nombre: string; tono: Tono }> = {
  a_tiempo: { nombre: 'A tiempo', tono: 'success' },
  por_vencer: { nombre: 'Por vencer', tono: 'warning' },
  vencida: { nombre: 'Vencida', tono: 'danger' },
  cumplida: { nombre: 'Cumplida', tono: 'neutral' },
  incumplida: { nombre: 'Incumplida', tono: 'danger' },
};

export function tonoPrioridad(nombre: string): Tono {
  const n = nombre.toLowerCase();
  if (n.startsWith('crít') || n.startsWith('crit')) return 'critical';
  if (n === 'alta') return 'review';
  if (n === 'media') return 'info';
  return 'neutral';
}

export type Accion = {
  estado: EstadoCodigo;
  etiqueta: string;
  pide?: 'comentario' | 'resolucion';
  ayuda?: string;
  peligro?: boolean;
};

// Copia de la tabla de transiciones del backend (docs/tecnico/03-estados-y-reglas.md) solo para
// decidir qué botones mostrar; quien decide de verdad es la API.
const ACCIONES: Partial<Record<EstadoCodigo, (Accion & { roles: UserRole[] })[]>> = {
  registrada: [
    { estado: 'aprobada', etiqueta: 'Aprobar', roles: ['coordinador'] },
    { estado: 'cancelada', etiqueta: 'Cancelar solicitud', pide: 'comentario', ayuda: 'Indica el motivo de la cancelación.', peligro: true, roles: ['coordinador', 'cliente'] },
  ],
  aprobada: [
    { estado: 'cancelada', etiqueta: 'Cancelar solicitud', pide: 'comentario', ayuda: 'Indica el motivo de la cancelación.', peligro: true, roles: ['coordinador', 'cliente'] },
  ],
  asignada: [{ estado: 'en_proceso', etiqueta: 'Iniciar atención', roles: ['tecnico'] }],
  en_proceso: [
    { estado: 'resuelta', etiqueta: 'Marcar como resuelta', pide: 'resolucion', ayuda: 'Describe qué se hizo para resolverla.', roles: ['tecnico'] },
    { estado: 'pendiente_info', etiqueta: 'Pedir información', pide: 'comentario', ayuda: '¿Qué necesitas que el cliente te indique?', roles: ['tecnico'] },
  ],
  pendiente_info: [
    { estado: 'en_proceso', etiqueta: 'Responder', pide: 'comentario', ayuda: 'Escribe la información que pidió el técnico.', roles: ['cliente', 'coordinador'] },
  ],
  resuelta: [
    { estado: 'cerrada', etiqueta: 'Cerrar solicitud', roles: ['coordinador'] },
    { estado: 'en_proceso', etiqueta: 'Rechazar resolución', pide: 'comentario', ayuda: 'Explica por qué la resolución no es suficiente.', roles: ['coordinador'] },
  ],
  cerrada: [
    { estado: 'en_proceso', etiqueta: 'Reabrir', pide: 'comentario', ayuda: 'La reapertura queda auditada: indica el motivo.', roles: ['coordinador', 'admin'] },
  ],
};

export const ESTADOS_ASIGNABLES: EstadoCodigo[] = ['aprobada', 'asignada', 'en_proceso', 'pendiente_info'];

export function accionesPara(solicitud: Pick<Solicitud, 'estado'>, rol: UserRole): Accion[] {
  return (ACCIONES[solicitud.estado] ?? []).filter((accion) => accion.roles.includes(rol));
}

const formato = new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeStyle: 'short' });
export const fechaHora = (valor: string | null) => (valor ? formato.format(new Date(valor)) : '—');
