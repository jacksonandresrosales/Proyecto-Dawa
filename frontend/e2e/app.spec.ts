import { test, expect } from '@playwright/test';

// Aquí irán los dos flujos exigidos: registro–asignación–atención y consulta–seguimiento–cierre (T-23).
test('la aplicación carga', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'ServiGest' })).toBeVisible();
});
