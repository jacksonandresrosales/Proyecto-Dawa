import { z } from 'zod';
import { listSchema } from './common.js';

const ESTADOS = ['registrada', 'aprobada', 'asignada', 'en_proceso', 'pendiente_info', 'resuelta', 'cerrada', 'cancelada'];
const id = z.number().int().positive();
const idEnQuery = z.coerce.number().int().positive();
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato AAAA-MM-DD');
const texto = (max) => z.string().trim().min(1, 'Es obligatorio').max(max);

export const solicitudListSchema = listSchema.omit({ activo: true }).extend({
  estado: z.enum(ESTADOS).optional(),
  prioridad: idEnQuery.optional(),
  categoria: idEnQuery.optional(),
  cliente: idEnQuery.optional(),
  tecnico: idEnQuery.optional(),
  desde: fecha.optional(),
  hasta: fecha.optional(),
});

export const solicitudCreateSchema = z.object({
  clienteId: id.optional(), // obligatorio para el coordinador; el cliente usa el suyo
  sedeId: id,
  categoriaId: id,
  prioridadId: id,
  equipo: texto(160),
  descripcion: texto(4000),
});

export const cambioEstadoSchema = z.object({
  estado: z.enum(ESTADOS),
  comentario: texto(1000).optional(),
  resolucion: texto(4000).optional(),
  version: id,
});

export const asignacionSchema = z.object({
  tecnicoId: id,
  justificacion: texto(1000).nullish(),
});
