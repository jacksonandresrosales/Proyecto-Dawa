import { API_BASE_URL, apiRequest, readApiToken, type ApiList } from '@/api/admin';

export type EstadoCodigo = 'registrada' | 'aprobada' | 'asignada' | 'en_proceso' | 'pendiente_info' | 'resuelta' | 'cerrada' | 'cancelada';
export type EstadoPlazo = 'a_tiempo' | 'por_vencer' | 'vencida' | 'cumplida' | 'incumplida' | null;

export type Solicitud = {
  id: number;
  codigo: string;
  estado: EstadoCodigo;
  prioridad: string;
  prioridadId: number;
  categoria: { id: number; nombre: string };
  cliente: { id: number; razonSocial: string };
  sede: { id: number; nombre: string };
  tecnico: { id: number; nombre: string } | null;
  equipo: string;
  descripcion: string;
  resolucion: string | null;
  fechaLimite: string;
  estadoPlazo: EstadoPlazo;
  createdAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
  version: number;
};

export type EventoHistorial = {
  id: number;
  estadoAnterior: EstadoCodigo | null;
  estadoNuevo: EstadoCodigo;
  usuario: string;
  comentario: string | null;
  fecha: string;
};

export type Opcion = { id: number; nombre: string };
export type Sede = Opcion & { direccion: string };
export type TecnicoOpcion = {
  id: number;
  disponible: boolean;
  cargaMax: number;
  usuario: { nombre: string; email: string; activo: boolean };
  especialidades: { especialidadId: number; especialidad: Opcion }[];
};
export type NuevaSolicitud = { clienteId?: number; sedeId: number; categoriaId: number; prioridadId: number; equipo: string; descripcion: string };

const json = (body: unknown) => ({ method: 'POST', body: JSON.stringify(body) });

export const listarSolicitudes = (params: URLSearchParams) => apiRequest<ApiList<Solicitud>>(`/solicitudes?${params}`);
export const obtenerSolicitud = async (id: number) => (await apiRequest<{ data: Solicitud }>(`/solicitudes/${id}`)).data;
export const obtenerHistorial = async (id: number) => (await apiRequest<{ data: EventoHistorial[] }>(`/solicitudes/${id}/historial`)).data;
export const crearSolicitud = async (body: NuevaSolicitud) => (await apiRequest<{ data: Solicitud }>('/solicitudes', json(body))).data;
export const cambiarEstado = async (id: number, body: { estado: EstadoCodigo; version: number; comentario?: string; resolucion?: string }) =>
  (await apiRequest<{ data: Solicitud }>(`/solicitudes/${id}/estado`, { ...json(body), method: 'PATCH' })).data;
export const asignarTecnico = async (id: number, body: { tecnicoId: number; justificacion?: string }) =>
  (await apiRequest<{ data: Solicitud }>(`/solicitudes/${id}/asignaciones`, json(body))).data;

const vigentes = <T,>(ruta: string) => apiRequest<ApiList<T>>(`${ruta}?activo=true&limit=100`).then((r) => r.data);
export const listarCategorias = () => vigentes<Opcion & { especialidadId: number }>('/categorias');
export const listarPrioridades = () => vigentes<Opcion & { horasSla: number }>('/prioridades');
export const listarClientes = () => vigentes<{ id: number; razonSocial: string }>('/clientes');
export const listarTecnicos = () => vigentes<TecnicoOpcion>('/tecnicos');
export const listarSedes = async (clienteId: number) => (await apiRequest<{ data: Sede[] }>(`/clientes/${clienteId}/sedes`)).data;

export type CargaTecnico = {
  id: number;
  nombre: string;
  disponible: boolean;
  cargaMax: number;
  especialidades: Opcion[];
  activas: { id: number; codigo: string; estado: EstadoCodigo; fechaLimite: string }[];
};
export const obtenerCarga = async () => (await apiRequest<{ data: CargaTecnico[] }>('/tecnicos/carga')).data;

export type Adjunto = { id: number; nombre: string; mime: string; tamano: number; subidoPor: string; createdAt: string };
export const TIPOS_ADJUNTO = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'text/plain'];
export const MAX_BYTES_ADJUNTO = 5 * 1024 * 1024;
export const MAX_ADJUNTOS = 5;
export const listarAdjuntos = async (id: number) => (await apiRequest<{ data: Adjunto[] }>(`/solicitudes/${id}/adjuntos`)).data;
// El archivo viaja tal cual como cuerpo; el tipo en Content-Type y el nombre en la URL.
export const subirAdjunto = async (id: number, archivo: File) => (await apiRequest<{ data: Adjunto }>(
  `/solicitudes/${id}/adjuntos?nombre=${encodeURIComponent(archivo.name)}`,
  { method: 'POST', body: archivo, headers: { 'Content-Type': archivo.type || 'application/octet-stream' } },
)).data;
// La descarga necesita el token, así que se pide con fetch y se entrega al navegador como blob.
export async function descargarAdjunto(id: number, adjunto: Adjunto) {
  const respuesta = await fetch(`${API_BASE_URL}/solicitudes/${id}/adjuntos/${adjunto.id}`, { headers: { Authorization: `Bearer ${readApiToken()}` } });
  if (!respuesta.ok) throw new Error('No se pudo descargar el archivo');
  const url = URL.createObjectURL(await respuesta.blob());
  const enlace = Object.assign(document.createElement('a'), { href: url, download: adjunto.nombre });
  enlace.click();
  URL.revokeObjectURL(url);
}
// Mismo filtro que la API, para avisar antes de subir.
export function problemaAdjunto(archivo: File, yaSubidos: number) {
  if (!TIPOS_ADJUNTO.includes(archivo.type)) return `${archivo.name}: solo se aceptan PDF, PNG, JPG, WEBP o TXT.`;
  if (archivo.size > MAX_BYTES_ADJUNTO) return `${archivo.name}: supera los 5 MB.`;
  if (yaSubidos >= MAX_ADJUNTOS) return `Una solicitud admite hasta ${MAX_ADJUNTOS} adjuntos.`;
  return '';
}
