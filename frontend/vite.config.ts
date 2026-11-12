import path from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // Mismo alias que tsconfig.json; lo usan los componentes de shadcn
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  test: {
    environment: 'jsdom',
    // Las pruebas E2E de e2e/ las ejecuta Playwright, no Vitest
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
