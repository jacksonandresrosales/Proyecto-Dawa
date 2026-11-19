import { z } from 'zod';
import { listSchema } from './common.js';

const rol = z.enum(['admin', 'coordinador', 'tecnico', 'cliente']);
const nombre = z.string().trim().min(1).max(120);
const email = z.string().trim().email().max(160);

export const usuarioListSchema = listSchema.extend({ rol: rol.optional() });
export const usuarioCreateSchema = z.object({
  nombre,
  email,
  rol: z.enum(['admin', 'coordinador']),
  telefono: z.string().trim().max(20).nullable().optional(),
});
export const usuarioUpdateSchema = z.object({
  nombre: nombre.optional(),
  email: email.optional(),
  rol: rol.optional(),
  telefono: z.string().trim().max(20).nullable().optional(),
  activo: z.boolean().optional(),
}).refine((values) => Object.values(values).some((value) => value !== undefined), {
  message: 'Debes indicar al menos un campo para actualizar',
});
