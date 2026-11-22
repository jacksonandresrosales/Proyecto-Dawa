import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SolicitudesPage from './SolicitudesPage';

let rol = 'cliente';
vi.mock('@/auth/AuthContext', () => ({ useAuth: () => ({ user: { id: 1, nombre: 'Ana', rol } }) }));

const solicitud = {
  id: 7, codigo: 'SOL-2026-000007', estado: 'pendiente_info', prioridad: 'Alta', prioridadId: 2,
  categoria: { id: 1, nombre: 'Conectividad' }, cliente: { id: 3, razonSocial: 'Comercial El Puerto' },
  sede: { id: 4, nombre: 'Matriz' }, tecnico: null, equipo: 'Router piso 2', descripcion: 'Sin conexión',
  resolucion: null, fechaLimite: '2026-11-22T18:00:00Z', estadoPlazo: 'vencida', createdAt: '2026-11-22T10:00:00Z',
  resolvedAt: null, closedAt: null, version: 4,
};

function responder(body: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
const pintar = () => render(<MemoryRouter><SolicitudesPage /></MemoryRouter>);

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('SolicitudesPage', () => {
  it('lista las solicitudes con estado, prioridad y plazo legibles', async () => {
    rol = 'cliente';
    const fetchMock = responder({ data: [solicitud], meta: { page: 1, limit: 10, total: 1 } });
    pintar();
    expect(await screen.findByRole('link', { name: 'SOL-2026-000007' })).toBeTruthy();
    const tabla = within(screen.getByRole('table'));
    expect(tabla.getByText('Pendiente de información')).toBeTruthy();
    expect(tabla.getByText('Vencida')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Mis solicitudes' })).toBeTruthy();
    expect(screen.queryByRole('columnheader', { name: 'Cliente' })).toBeNull(); // el cliente no ve su propio nombre como columna
    expect(String(fetchMock.mock.calls[0][0])).toContain('/solicitudes?page=1&limit=10');
  });

  it('explica el estado vacío al técnico y no le ofrece registrar', async () => {
    rol = 'tecnico';
    responder({ data: [], meta: { page: 1, limit: 10, total: 0 } });
    pintar();
    expect(await screen.findByText('Aquí verás las solicitudes que te asignen.')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Nueva solicitud' })).toBeNull();
  });

  it('muestra el error de la API con opción de reintentar', async () => {
    rol = 'coordinador';
    responder({ error: { code: 'ERROR_INTERNO', message: 'Ocurrió un error inesperado' } }, 500);
    pintar();
    expect((await screen.findByRole('alert')).textContent).toContain('Ocurrió un error inesperado');
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
  });
});
