import { z } from 'zod';

const usuario = z.object({
  nombre: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(160),
  telefono: z.string().trim().max(20).optional().nullable(),
});
const sede = z.object({ nombre: z.string().trim().min(1).max(120), direccion: z.string().trim().min(1).max(200) });
export const clienteCreateSchema = usuario.extend({ razonSocial: z.string().trim().min(1).max(160), ruc: z.string().regex(/^\d{13}$/, 'Debe tener 13 dígitos'), sedes: z.array(sede).min(1) });
export const clienteUpdateSchema = clienteCreateSchema.partial().omit({ sedes: true }).extend({ sedes: z.array(sede).min(1).optional(), activo: z.boolean().optional() });
export const tecnicoCreateSchema = usuario.extend({ disponible: z.boolean().optional(), cargaMax: z.number().int().min(1).max(20).optional(), especialidadIds: z.array(z.number().int().positive()).min(1) });
export const tecnicoUpdateSchema = tecnicoCreateSchema.partial().extend({ activo: z.boolean().optional() });
