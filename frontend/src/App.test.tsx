import { afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

afterEach(() => vi.unstubAllGlobals());

describe('App', () => {
  it('muestra el inicio de sesión cuando no existe una sesión', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Olvidé mi contraseña' })).toBeTruthy();
  });

  it('ofrece configurar el primer administrador solo cuando la API lo requiere', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { setupRequired: true } }),
    }));

    render(<App />);
    expect(await screen.findByRole('link', { name: 'Primera vez: crear administrador inicial' })).toBeTruthy();
  });
});
