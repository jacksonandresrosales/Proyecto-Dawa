import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../helpers/api.js';
import { limpiarBase, prisma } from '../helpers/db.js';

process.env.JWT_SECRET = 'integration-test-secret';
process.env.JWT_EXPIRES_IN = '8h';

let adminId;
let adminToken;
let tempUserId;

async function createUser(rolId, email, password, debeCambiarPassword = false) {
  return prisma.usuario.create({
    data: {
      rolId,
      nombre: 'Cuenta de prueba',
      email,
      passwordHash: await bcrypt.hash(password, 4),
      debeCambiarPassword,
      activo: true,
    },
  });
}

const authHeader = (token = adminToken) => ({ Authorization: `Bearer ${token}` });

beforeEach(async () => {
  await limpiarBase();
  const [adminRole, coordinatorRole, technicianRole, clientRole] = await Promise.all([
    prisma.rol.create({ data: { nombre: 'admin' } }),
    prisma.rol.create({ data: { nombre: 'coordinador' } }),
    prisma.rol.create({ data: { nombre: 'tecnico' } }),
    prisma.rol.create({ data: { nombre: 'cliente' } }),
  ]);
  expect([coordinatorRole, technicianRole, clientRole]).toHaveLength(3);
  const admin = await createUser(adminRole.id, 'admin@security.test', 'Current123');
  adminId = admin.id;
  adminToken = jwt.sign({ sub: String(admin.id), rol: 'admin' }, process.env.JWT_SECRET);
});

describe('autenticación y usuarios', () => {
  it('permite crear e iniciar sesión con el primer administrador una sola vez', async () => {
    await prisma.usuario.delete({ where: { id: adminId } });

    const statusBefore = await api().get('/api/auth/setup-status');
    expect(statusBefore.body.data.setupRequired).toBe(true);

    const attempts = await Promise.all([
      api().post('/api/auth/setup').send({
        nombre: 'Administradora inicial',
        email: 'owner@security.test',
        password: 'OwnerPassword123',
      }),
      api().post('/api/auth/setup').send({
        nombre: 'Otra administradora',
        email: 'other-owner@security.test',
        password: 'OtherPassword123',
      }),
    ]);
    const setup = attempts.find((response) => response.status === 201);
    const rejectedSetup = attempts.find((response) => response.status === 409);
    expect(setup).toBeTruthy();
    expect(rejectedSetup.body.error.code).toBe('CONFIGURACION_COMPLETADA');
    expect(setup.body.data.token).toEqual(expect.any(String));
    // Las dos peticiones compiten: cualquiera puede ganar, pero solo una.
    expect(['owner@security.test', 'other-owner@security.test']).toContain(setup.body.data.usuario.email);
    expect(setup.body.data.usuario).toMatchObject({
      rol: 'admin',
      debeCambiarPassword: false,
    });
    expect(setup.body.data.usuario.passwordHash).toBeUndefined();

    const profile = await api().get('/api/auth/me')
      .set(authHeader(setup.body.data.token));
    expect(profile.status).toBe(200);

    const statusAfter = await api().get('/api/auth/setup-status');
    expect(statusAfter.body.data.setupRequired).toBe(false);
    expect(await prisma.usuario.count({ where: { rol: { nombre: 'admin' } } })).toBe(1);
  });

  it('deshabilita la configuración pública del primer administrador en producción', async () => {
    await prisma.usuario.delete({ where: { id: adminId } });
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const status = await api().get('/api/auth/setup-status');
      expect(status.body.data.setupRequired).toBe(false);

      const setup = await api().post('/api/auth/setup').send({
        nombre: 'Admin no autorizado',
        email: 'blocked-owner@security.test',
        password: 'BlockedPassword123',
      });
      expect(setup.status).toBe(404);
      expect(setup.body.error.code).toBe('CONFIGURACION_NO_DISPONIBLE');
    } finally {
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnv;
    }
  });

  it('inicia sesión, devuelve un JWT y nunca expone el hash de contraseña', async () => {
    const response = await api().post('/api/auth/login').send({
      email: 'ADMIN@SECURITY.TEST',
      password: 'Current123',
    });

    expect(response.status).toBe(200);
    expect(response.body.data.token).toEqual(expect.any(String));
    expect(response.body.data.usuario).toMatchObject({ email: 'admin@security.test', rol: 'admin' });
    expect(response.body.data.usuario.passwordHash).toBeUndefined();

    const profile = await api().get('/api/auth/me').set(authHeader(response.body.data.token));
    expect(profile.status).toBe(200);
    expect(profile.body.data).toMatchObject({ id: adminId, debeCambiarPassword: false });
    expect(profile.body.data.passwordHash).toBeUndefined();
  });

  it('rechaza contraseñas de login que exceden el límite de 72 bytes de bcrypt', async () => {
    const role = await prisma.rol.findUniqueOrThrow({ where: { nombre: 'admin' } });
    const password = `${'a'.repeat(68)}1bé`;
    await createUser(role.id, 'bcrypt-limit@security.test', password);

    const exactPassword = await api().post('/api/auth/login').send({
      email: 'bcrypt-limit@security.test',
      password,
    });
    const suffixPassword = await api().post('/api/auth/login').send({
      email: 'bcrypt-limit@security.test',
      password: `${password}x`,
    });

    expect(exactPassword.status).toBe(200);
    expect(suffixPassword.status).toBe(422);
  });

  it('usa la misma respuesta para correo inexistente y contraseña incorrecta', async () => {
    const wrongPassword = await api().post('/api/auth/login').send({
      email: 'admin@security.test',
      password: 'Wrong1234',
    });
    const missingEmail = await api().post('/api/auth/login').send({
      email: 'missing@security.test',
      password: 'Wrong1234',
    });

    expect(wrongPassword.status).toBe(401);
    expect(missingEmail.status).toBe(401);
    expect(wrongPassword.body.error).toEqual(missingEmail.body.error);
  });

  it('obliga a cambiar la clave temporal antes de usar otras rutas protegidas', async () => {
    const role = await prisma.rol.findUniqueOrThrow({ where: { nombre: 'coordinador' } });
    const temporary = await createUser(role.id, 'temp@security.test', 'Temporary123', true);
    tempUserId = temporary.id;
    const login = await api().post('/api/auth/login').send({ email: temporary.email, password: 'Temporary123' });

    const blocked = await api().get('/api/usuarios').set(authHeader(login.body.data.token));
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe('CAMBIO_PASSWORD_REQUERIDO');

    const changed = await api().patch('/api/auth/me')
      .set(authHeader(login.body.data.token))
      .send({ newPassword: 'Personal123' });
    expect(changed.status).toBe(200);
    expect(changed.body.data.debeCambiarPassword).toBe(false);
    expect(changed.body.data.passwordHash).toBeUndefined();

    const allowed = await api().get('/api/auth/me').set(authHeader(login.body.data.token));
    expect(allowed.status).toBe(200);
  });

  it('restablece contraseña con token de un solo uso y no revela si existe el correo', async () => {
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    try {
      const requestForKnown = await api().post('/api/auth/forgot').send({ email: 'admin@security.test' });
      const requestForUnknown = await api().post('/api/auth/forgot').send({ email: 'nobody@security.test' });
      expect(requestForKnown.status).toBe(200);
      expect(requestForKnown.body).toEqual(requestForUnknown.body);

      const resetLink = String(log.mock.calls[0][0]);
      const token = resetLink.match(/token=([a-f0-9]{64})/i)?.[1];
      expect(token).toBeTruthy();
      const stored = await prisma.passwordReset.findFirstOrThrow();
      expect(stored.tokenHash).not.toBe(token);

      const reset = await api().post('/api/auth/reset').send({ token, newPassword: 'Recovered123' });
      expect(reset.status).toBe(200);
      const replay = await api().post('/api/auth/reset').send({ token, newPassword: 'Another123' });
      expect(replay.status).toBe(422);
      expect(replay.body.error.code).toBe('TOKEN_INVALIDO');

      const login = await api().post('/api/auth/login').send({
        email: 'admin@security.test',
        password: 'Recovered123',
      });
      expect(login.status).toBe(200);
    } finally {
      log.mockRestore();
    }
  });

  it('crea y restablece cuentas desde administración, evitando desactivar al último admin', async () => {
    const lastAdmin = await api().delete(`/api/usuarios/${adminId}`).set(authHeader());
    expect(lastAdmin.status).toBe(422);
    expect(lastAdmin.body.error.code).toBe('NO_PUEDE_DESACTIVARSE');

    const created = await api().post('/api/usuarios').set(authHeader()).send({
      nombre: 'Coordinadora',
      email: 'coord@security.test',
      rol: 'coordinador',
    });
    expect(created.status).toBe(201);
    expect(created.body.data.passwordTemporal).toEqual(expect.any(String));
    expect(created.body.data.usuario.passwordHash).toBeUndefined();
    tempUserId = created.body.data.usuario.id;

    const duplicate = await api().post('/api/usuarios').set(authHeader()).send({
      nombre: 'Otra cuenta',
      email: 'COORD@SECURITY.TEST',
      rol: 'coordinador',
    });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('DUPLICADO');

    const reset = await api().post(`/api/usuarios/${tempUserId}/restablecer-password`).set(authHeader());
    expect(reset.status).toBe(200);
    expect(reset.body.data.passwordTemporal).toEqual(expect.any(String));

    const list = await api().get('/api/usuarios?rol=coordinador&page=1&limit=5').set(authHeader());
    expect(list.status).toBe(200);
    expect(list.body.meta.total).toBe(1);
    expect(list.body.data[0].passwordHash).toBeUndefined();

    const deactivated = await api().delete(`/api/usuarios/${tempUserId}`).set(authHeader());
    expect(deactivated.status).toBe(204);
    const user = await prisma.usuario.findUnique({ where: { id: tempUserId } });
    expect(user.activo).toBe(false);
    expect(user.debeCambiarPassword).toBe(true);
  });

  it('cierra la sesión sin cambiar el estado de otros usuarios', async () => {
    const response = await api().post('/api/auth/logout').set(authHeader());
    expect(response.status).toBe(204);
    const user = await prisma.usuario.findUnique({ where: { id: adminId } });
    expect(user.activo).toBe(true);
  });
});
