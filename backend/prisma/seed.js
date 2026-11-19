import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.INITIAL_ADMIN_PASSWORD;

async function seed() {
  const roles = ['admin', 'coordinador', 'tecnico', 'cliente'];
  for (const nombre of roles) {
    await prisma.rol.upsert({ where: { nombre }, update: {}, create: { nombre } });
  }

  if (!email && !password) {
    console.info('Roles iniciales creados. Crea el primer administrador desde /configurar.');
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
