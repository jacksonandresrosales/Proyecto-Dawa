import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ESTADOS = [
  { codigo: 'registrada', nombre: 'Registrada', esFinal: false },
  { codigo: 'aprobada', nombre: 'Aprobada', esFinal: false },
  { codigo: 'asignada', nombre: 'Asignada', esFinal: false },
  { codigo: 'en_proceso', nombre: 'En proceso', esFinal: false },
  { codigo: 'pendiente_info', nombre: 'Pendiente de información', esFinal: false },
  { codigo: 'resuelta', nombre: 'Resuelta', esFinal: false },
  { codigo: 'cerrada', nombre: 'Cerrada', esFinal: true },
  { codigo: 'cancelada', nombre: 'Cancelada', esFinal: true },
];

const PRIORIDADES = [
  { nombre: 'Crítica', horasSla: 4 },
  { nombre: 'Alta', horasSla: 8 },
  { nombre: 'Media', horasSla: 24 },
  { nombre: 'Baja', horasSla: 72 },
];

const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.INITIAL_ADMIN_PASSWORD;

async function seed() {
  const roles = ['admin', 'coordinador', 'tecnico', 'cliente'];
  for (const nombre of roles) {
    await prisma.rol.upsert({ where: { nombre }, update: {}, create: { nombre } });
  }

  // La migración ya inserta los estados; se repite aquí por si la tabla se vació (pruebas).
  for (const estado of ESTADOS) {
    await prisma.estado.upsert({ where: { codigo: estado.codigo }, update: {}, create: estado });
  }

  // Plazos iniciales (03-estados-y-reglas.md). Si el admin ya los editó, no se tocan.
  for (const prioridad of PRIORIDADES) {
    const existe = await prisma.prioridad.findFirst({
      where: { nombre: { equals: prioridad.nombre, mode: 'insensitive' } },
    });
    if (!existe) await prisma.prioridad.create({ data: prioridad });
  }

  if (!email && !password) {
    console.info('Roles, estados y prioridades listos. Crea el primer administrador desde /configurar.');
    return;
  }
  if (!email || !password) {
    throw new Error('Para crear un administrador con el seed, define INITIAL_ADMIN_EMAIL e INITIAL_ADMIN_PASSWORD');
  }
  if (password.length < 8 || password.length > 72 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new Error('INITIAL_ADMIN_PASSWORD debe tener 8-72 caracteres, una letra y un número');
  }

  const existing = await prisma.usuario.findUnique({ where: { email } });
  if (existing) return;

  const rol = await prisma.rol.findUniqueOrThrow({ where: { nombre: 'admin' } });
  await prisma.usuario.create({
    data: {
      rolId: rol.id,
      nombre: 'Administrador',
      email,
      passwordHash: await bcrypt.hash(password, 10),
      debeCambiarPassword: true,
      activo: true,
    },
  });
  console.info(`Cuenta inicial creada para ${email}. Cambia la contraseña en el primer acceso.`);
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
