import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import AdminPage from './AdminPage';

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({
    token: 'test-token',
    user: { nombre: 'Admin de prueba', rol: 'admin' },
  }),
}));

afterEach(() => vi.unstubAllGlobals());

describe('AdminPage', () => {
  it('conserva el foco al escribir el nombre de una sede', () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [], meta: { page: 1, limit: 10, total: 0 } }),
    }));

    render(<AdminPage />);
    const nombreSede = screen.getByRole('textbox', { name: 'Nombre' });
    nombreSede.focus();
    fireEvent.change(nombreSede, { target: { value: 'S' } });

    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Nombre' }));
  });
});
