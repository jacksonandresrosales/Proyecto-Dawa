import { afterEach, describe, expect, it, vi } from 'vitest';
import { escucharNotificaciones } from './notificaciones';
import { saveApiToken } from './admin';

afterEach(() => vi.unstubAllGlobals());

describe('escucharNotificaciones', () => {
  it('envía el token en la cabecera y entrega cada evento aunque llegue partido en trozos', async () => {
    saveApiToken('jwt-de-prueba');
    const trozos = [': conectado\n\n', 'event: notificacion\ndata: {"tipo":"asignacion","mensaje":"Se te asignó ', 'la solicitud SOL-2026-000001","solicitudId":1}\n\n: latido\n\n'];
    const cuerpo = new ReadableStream({ start(c) { for (const t of trozos) c.enqueue(new TextEncoder().encode(t)); c.close(); } });
    const fetchMock = vi.fn().mockResolvedValue(new Response(cuerpo, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const avisos: unknown[] = [];
    await escucharNotificaciones((aviso) => avisos.push(aviso), new AbortController().signal);

    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer jwt-de-prueba');
    expect(String(fetchMock.mock.calls[0][0])).not.toContain('jwt-de-prueba');
    expect(avisos).toEqual([{ tipo: 'asignacion', mensaje: 'Se te asignó la solicitud SOL-2026-000001', solicitudId: 1 }]);
  });
});
