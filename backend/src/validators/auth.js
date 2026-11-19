import { z } from 'zod';

const password = z.string()
  .min(8, 'Debe tener al menos 8 caracteres')
  .max(72, 'No puede superar 72 caracteres')
  .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, 'Debe incluir al menos una letra y un número')
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'La contraseña es demasiado larga');

export const loginSchema = z.object({
  email: z.string().trim().email().max(160),
  password: z.string().min(1).max(72)
    .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'La contraseña es demasiado larga'),
});

export const initialSetupSchema = z.object({
  nombre: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(160),
  password,
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email().max(160),
});

export const resetPasswordSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/i),
  newPassword: password,
});

export const profileUpdateSchema = z.object({
  nombre: z.string().trim().min(1).max(120).optional(),
  telefono: z.string().trim().max(20).nullable().optional(),
  currentPassword: z.string().min(1).max(72).optional(),
  newPassword: password.optional(),
}).refine((values) => Object.values(values).some((value) => value !== undefined), {
  message: 'Debes indicar al menos un campo para actualizar',
}).refine((values) => values.nombre !== undefined || values.telefono !== undefined || values.newPassword !== undefined, {
  message: 'Debes indicar un campo de perfil o una nueva contraseña',
});

export { password as passwordSchema };
