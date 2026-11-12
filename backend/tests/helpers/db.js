import { prisma } from '../../src/repositories/prisma.js';

// Vacía todas las tablas. Usar en beforeEach de las pruebas de integración.
export async function limpiarBase() {
  if (!process.env.DATABASE_URL.includes('test')) {
    throw new Error('limpiarBase solo puede ejecutarse contra la base de pruebas');
  }
  const tablas = await prisma.$queryRaw`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tablas.length === 0) return;
  const lista = tablas.map((t) => `"${t.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE ${lista} RESTART IDENTITY CASCADE`);
}

export { prisma };
