import * as repository from '../repositories/dashboardRepository.js';
import { calcularIndicadores } from './indicadores.js';
import { filtros } from './solicitudesService.js';
import { ESTADOS_ACTIVOS } from './transiciones.js';

// Filtros: periodo (desde/hasta) y dimensiones categoría, técnico y cliente, con la misma lógica que la lista.
export async function indicadores(query, ahora = new Date()) {
  const where = filtros({ desde: query.desde, hasta: query.hasta, categoria: query.categoria, tecnico: query.tecnico, cliente: query.cliente });
  const activasWhere = {
    estado: { codigo: { in: ESTADOS_ACTIVOS } },
    ...(query.categoria ? { categoriaId: Number(query.categoria) } : {}),
    ...(query.cliente ? { clienteId: Number(query.cliente) } : {}),
  };
  const [solicitudes, tecnicos] = await Promise.all([
    repository.solicitudesParaIndicadores(where),
    repository.cargaTecnicos(query.tecnico ? { id: Number(query.tecnico) } : {}, activasWhere),
  ]);
  return {
    ...calcularIndicadores(solicitudes, { desde: query.desde, hasta: query.hasta }, ahora),
    cargaPorTecnico: tecnicos.map((t) => ({
      tecnicoId: t.id,
      tecnico: t.usuario.nombre,
      activas: t._count.solicitudes,
      cargaMax: t.cargaMax,
      disponible: t.disponible,
    })),
  };
}
