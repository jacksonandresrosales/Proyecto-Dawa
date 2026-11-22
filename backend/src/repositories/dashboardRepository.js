import { prisma } from './prisma.js';

// shortcut: trae las solicitudes filtradas y calcula en memoria; sobra para miles de registros.
// Si el volumen crece a cientos de miles, pasar los conteos a SQL agregado.
export const solicitudesParaIndicadores = (where) => prisma.solicitud.findMany({
  where,
  select: {
    id: true,
    codigo: true,
    createdAt: true,
    fechaLimite: true,
    resolvedAt: true,
    estado: { select: { codigo: true } },
    prioridad: { select: { nombre: true, horasSla: true } },
  },
});

// Carga actual (no depende del periodo): solicitudes activas de cada técnico con cuenta vigente.
export const cargaTecnicos = (whereTecnico, whereSolicitudes) => prisma.tecnico.findMany({
  where: { ...whereTecnico, usuario: { activo: true } },
  select: {
    id: true,
    cargaMax: true,
    disponible: true,
    usuario: { select: { nombre: true } },
    _count: { select: { solicitudes: { where: whereSolicitudes } } },
  },
  orderBy: { usuario: { nombre: 'asc' } },
});
