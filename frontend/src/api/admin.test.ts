import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, readApiToken, saveApiToken } from './admin';

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
