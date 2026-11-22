import { apiRequest } from '@/api/admin';
import type { EstadoCodigo } from '@/api/solicitudes';

export type Indicadores = {
  total: number;
  abiertas: number;
  vencidas: number;
  porVencer: number;
  cumplimientoPlazo: number | null;
  tiempoPromedioResolucionHoras: number | null;
  porEstado: { estado: EstadoCodigo; cantidad: number }[];
  porPrioridad: { prioridad: string; cantidad: number }[];
  cargaPorTecnico: { tecnicoId: number; tecnico: string; activas: number; cargaMax: number; disponible: boolean }[];
  evolucion: { fecha: string; creadas: number; resueltas: number }[];
  proximasAVencer: { id: number; codigo: string; fechaLimite: string }[];
};

export const obtenerIndicadores = async (params: URLSearchParams) =>
  (await apiRequest<{ data: Indicadores }>(`/dashboard/indicadores?${params}`)).data;
