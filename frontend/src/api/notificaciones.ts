import { API_BASE_URL, apiRequest, readApiToken, type ApiList } from '@/api/admin';

export type Notificacion = {
  id: number;
  tipo: 'registro' | 'asignacion' | 'cambio_estado' | 'solicitud_info' | 'cierre';
  mensaje: string;
  leida: boolean;
  solicitudId: number | null;
  createdAt: string;
};
export type AvisoEnVivo = Pick<Notificacion, 'tipo' | 'mensaje' | 'solicitudId'>;
type Lista = { data: Notificacion[]; meta: ApiList<Notificacion>['meta'] & { noLeidas: number } };

export const listarNotificaciones = () => apiRequest<Lista>('/notificaciones?limit=8');
export const marcarLeida = (id: number) => apiRequest<void>(`/notificaciones/${id}/leida`, { method: 'PATCH' });
export const marcarTodas = () => apiRequest<unknown>('/notificaciones/leidas', { method: 'PATCH' });

// Lee el flujo SSE con fetch (y no con EventSource) para enviar el token en la cabecera y no en la URL.
// Termina cuando el servidor cierra la conexión o se aborta la señal.
export async function escucharNotificaciones(alRecibir: (aviso: AvisoEnVivo) => void, signal: AbortSignal) {
  const respuesta = await fetch(`${API_BASE_URL}/notificaciones/stream`, { headers: { Authorization: `Bearer ${readApiToken()}` }, signal });
  if (!respuesta.ok || !respuesta.body) throw new Error('No se pudo abrir el flujo de notificaciones');
  const lector = respuesta.body.pipeThrough(new TextDecoderStream()).getReader();
  let pendiente = '';
  for (;;) {
    const { value, done } = await lector.read();
    if (done) return;
    pendiente += value;
    const eventos = pendiente.split('\n\n');
    pendiente = eventos.pop() ?? '';
    for (const evento of eventos) {
      const datos = evento.split('\n').find((linea) => linea.startsWith('data: '));
      if (evento.includes('event: notificacion') && datos) alRecibir(JSON.parse(datos.slice(6)) as AvisoEnVivo);
    }
  }
}
