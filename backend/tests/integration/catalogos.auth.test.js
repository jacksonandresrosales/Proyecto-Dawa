import { describe, expect, it } from 'vitest';
import { api } from '../helpers/api.js';

describe('protección de catálogos', () => {
  it('requiere JWT para consultar especialidades', async () => {
    const res = await api().get('/api/especialidades');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('NO_AUTENTICADO');
  });

  it('rechaza cuerpos inválidos antes de acceder al servicio', async () => {
    const res = await api().post('/api/categorias').set('Authorization', 'Bearer token-invalido').send({ nombre: '' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_INVALIDO');
  });
});
