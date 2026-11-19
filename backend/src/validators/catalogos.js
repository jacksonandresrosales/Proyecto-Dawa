import { z } from 'zod';

const nombre = z.string().trim().min(1, 'Es obligatorio').max(80);
export const especialidadCreateSchema = z.object({ nombre, activo: z.boolean().optional() });
export const especialidadUpdateSchema = especialidadCreateSchema.partial();
export const categoriaCreateSchema = z.object({ nombre, especialidadId: z.number().int().positive(), activo: z.boolean().optional() });
export const categoriaUpdateSchema = categoriaCreateSchema.partial();
export const prioridadCreateSchema = z.object({ nombre: z.string().trim().min(1).max(20), horasSla: z.number().int().positive(), activo: z.boolean().optional() });
export const prioridadUpdateSchema = prioridadCreateSchema.partial();
