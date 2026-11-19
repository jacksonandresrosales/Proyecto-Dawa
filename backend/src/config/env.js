import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  CORS_ORIGIN: z.string().url(),
  PORT: z.coerce.number().int().positive().default(3000),
});

export function validateEnvironment(env = process.env) {
  const result = schema.safeParse(env);
  if (!result.success) {
    const invalid = result.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Configuración de entorno inválida: ${invalid}`);
  }
  return result.data;
}
