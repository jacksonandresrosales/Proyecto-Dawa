import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EVENTO_SESION_VENCIDA, apiRequest, readApiToken, saveApiToken } from './admin';

describe('admin API client', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends the session JWT as a Bearer authorization header', async () => {
    saveApiToken('  jwt-value  ');
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await apiRequest('/clientes');

    expect(readApiToken()).toBe('jwt-value');
    expect(fetchMock.mock.calls[0][1].headers.get('Authorization')).toBe('Bearer jwt-value');
  });

  it('exposes API validation and duplicate messages to the caller', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error: { code: 'DUPLICADO', message: 'Ya existe este RUC' } }),
      { status: 409 },
    )));

    await expect(apiRequest('/clientes', { method: 'POST', body: '{}' }))
      .rejects.toMatchObject({ code: 'DUPLICADO', message: 'Ya existe este RUC' });
  });

  it('removes the stored token when the user disconnects', () => {
    saveApiToken('jwt-value');
    saveApiToken('');
    expect(readApiToken()).toBe('');
  });
});

describe('sesión vencida', () => {
  afterEach(() => vi.unstubAllGlobals());
  const responder401 = (code: string) => vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ error: { code, message: 'El token no es válido o venció' } }), { status: 401 }),
  ));

  it('borra el token y avisa cuando una petición con sesión recibe 401', async () => {
    saveApiToken('jwt-vencido');
    const avisos: unknown[] = [];
    const escuchar = (e: Event) => avisos.push((e as CustomEvent).detail);
    window.addEventListener(EVENTO_SESION_VENCIDA, escuchar);
    responder401('TOKEN_INVALIDO');

    await expect(apiRequest('/solicitudes')).rejects.toThrow('El token no es válido o venció');
    expect(readApiToken()).toBe('');
    expect(avisos).toEqual(['TOKEN_INVALIDO']);
    window.removeEventListener(EVENTO_SESION_VENCIDA, escuchar);
  });

  it('no trata como sesión vencida un login con credenciales incorrectas', async () => {
    saveApiToken('');
    const escuchar = vi.fn();
    window.addEventListener(EVENTO_SESION_VENCIDA, escuchar);
    responder401('CREDENCIALES_INVALIDAS');

    await expect(apiRequest('/auth/login', { method: 'POST', body: '{}' })).rejects.toThrow();
    expect(escuchar).not.toHaveBeenCalled();
    window.removeEventListener(EVENTO_SESION_VENCIDA, escuchar);
  });
});
