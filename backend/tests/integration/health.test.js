import { describe, it, expect, beforeEach } from 'vitest';
import { api } from '../helpers/api.js';
import { limpiarBase, prisma } from '../helpers/db.js';

beforeEach(limpiarBase);

describe('API base', () => {
  it('GET /api/health responde ok con la base conectada', async () => {
    const res = await api().get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ status: 'ok', db: true });
  });

  it('una ruta inexistente responde 404 con el formato de error', async () => {
    const res = await api().get('/api/no-existe');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NO_ENCONTRADO');
  });

  it('un JSON mal formado responde 400', async () => {
    const res = await api().post('/api/health').set('Content-Type', 'application/json').send('{mal');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('JSON_INVALIDO');
  });

  it('la base aplica las restricciones del esquema (nombre de rol único)', async () => {
    await prisma.rol.create({ data: { nombre: 'admin' } });
    await expect(prisma.rol.create({ data: { nombre: 'admin' } })).rejects.toThrow();
  });
});
