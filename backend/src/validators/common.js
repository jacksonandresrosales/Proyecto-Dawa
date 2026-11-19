import { z } from 'zod';

export const idSchema = z.object({ id: z.coerce.number().int().positive() });
export const listSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  q: z.string().trim().max(160).optional(),
  activo: z.enum(['true', 'false']).optional(),
});
