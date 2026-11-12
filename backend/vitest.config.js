import { defineConfig } from 'vitest/config';

// Unitarias: reglas de negocio y utilidades, sin base de datos.
export default defineConfig({
  test: { include: ['tests/unit/**/*.test.js'] },
});
