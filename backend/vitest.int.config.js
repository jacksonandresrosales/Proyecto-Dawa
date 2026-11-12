import { defineConfig } from 'vitest/config';

// Integración: endpoints reales contra la base de pruebas (db_test de docker-compose).
// En CI, DATABASE_URL ya viene definida y apunta al servicio de PostgreSQL.
process.env.DATABASE_URL ??= 'postgresql://servigest:servigest@localhost:5433/servigest_test';

export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.js'],
    globalSetup: './tests/helpers/global-setup.js',
    // Todos los archivos comparten una base: se ejecutan de uno en uno
    fileParallelism: false,
  },
});
