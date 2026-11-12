import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://localhost:5173' },
  // Levanta el frontend antes de las pruebas; reutiliza el que ya esté corriendo en local
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
