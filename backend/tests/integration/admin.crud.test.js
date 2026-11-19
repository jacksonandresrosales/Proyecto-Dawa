import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it } from 'vitest';
import { api } from '../helpers/api.js';
import { limpiarBase, prisma } from '../helpers/db.js';

process.env.JWT_SECRET = 'integration-test-secret';

let adminToken;
let clienteToken;

async function crearUsuario(rolId, email) {
  return prisma.usuario.create({
    data: {
      rolId,
      nombre: 'Usuario de prueba',
      email,
      passwordHash: 'hash-de-prueba',
      debeCambiarPassword: false,
    },
  });
}

function bearer(token) {
  return `Bearer ${token}`;
}

beforeEach(async () => {
  await limpiarBase();
  const [adminRole, coordinatorRole, clientRole, technicianRole] = await Promise.all([
    prisma.rol.create({ data: { nombre: 'admin' } }),
    prisma.rol.create({ data: { nombre: 'coordinador' } }),
    prisma.rol.create({ data: { nombre: 'cliente' } }),
    prisma.rol.create({ data: { nombre: 'tecnico' } }),
  ]);
  const admin = await crearUsuario(adminRole.id, 'admin@test.local');
  const client = await crearUsuario(clientRole.id, 'cliente@test.local');
  adminToken = jwt.sign({ sub: String(admin.id) }, process.env.JWT_SECRET);
  clienteToken = jwt.sign({ sub: String(client.id) }, process.env.JWT_SECRET);
  expect(coordinatorRole.id).toBeGreaterThan(0);
  expect(technicianRole.id).toBeGreaterThan(0);
});

describe('CRUD de administración', () => {
  it('crea clientes, filtra sus listas y responde conflictos por RUC/correo duplicados', async () => {
    const body = {
      nombre: 'Contacto',
      email: 'Contacto@Empresa.test',
      password: 'password-segura',
      razonSocial: 'Empresa de prueba',
      ruc: '1234567890123',
      sedes: [{ nombre: 'Matriz', direccion: 'Av. Central 100' }],
    };
    const created = await api().post('/api/clientes').set('Authorization', bearer(adminToken)).send(body);

    expect(created.status).toBe(201);
    expect(created.body.data.usuario.email).toBe('contacto@empresa.test');
    expect(created.body.data.usuario.passwordHash).toBeUndefined();
    expect(created.body.data.sedes).toHaveLength(1);

    const duplicateRuc = await api().post('/api/clientes').set('Authorization', bearer(adminToken)).send({
      ...body,
      email: 'otro@empresa.test',
    });
    expect(duplicateRuc.status).toBe(409);
    expect(duplicateRuc.body.error.code).toBe('DUPLICADO');
    expect(duplicateRuc.body.error.details[0].campo).toBe('ruc');

    const list = await api().get('/api/clientes?page=1&limit=1&q=empresa')
      .set('Authorization', bearer(adminToken));
    expect(list.status).toBe(200);
    expect(list.body.meta).toMatchObject({ page: 1, limit: 1, total: 1 });

    const deactivate = await api().patch(`/api/clientes/${created.body.data.id}`)
      .set('Authorization', bearer(adminToken))
      .send({ activo: false });
    expect(deactivate.status).toBe(200);
    expect(deactivate.body.data.activo).toBe(false);
    expect(deactivate.body.data.usuario.activo).toBe(false);

    const deleteInUse = await api().delete(`/api/clientes/${created.body.data.id}`)
      .set('Authorization', bearer(adminToken));
    expect(deleteInUse.status).toBe(409);
    expect(deleteInUse.body.error.code).toBe('EN_USO');
  });

  it('vincula especialidades a técnicos y bloquea borrar catálogos relacionados', async () => {
    const specialtyResponse = await api().post('/api/especialidades')
      .set('Authorization', bearer(adminToken))
      .send({ nombre: 'Redes' });
    expect(specialtyResponse.status).toBe(201);
    const specialtyId = specialtyResponse.body.data.id;

    const caseDuplicate = await api().post('/api/especialidades')
      .set('Authorization', bearer(adminToken))
      .send({ nombre: 'redes' });
    expect(caseDuplicate.status).toBe(409);
    expect(caseDuplicate.body.error.code).toBe('DUPLICADO');

    const category = await api().post('/api/categorias')
      .set('Authorization', bearer(adminToken))
      .send({ nombre: 'Cableado', especialidadId: specialtyId });
    expect(category.status).toBe(201);

    const technician = await api().post('/api/tecnicos')
      .set('Authorization', bearer(adminToken))
      .send({
        nombre: 'Técnico de prueba',
        email: 'tecnico@test.local',
        password: 'password-segura',
        especialidadIds: [specialtyId],
        disponible: true,
        cargaMax: 3,
      });
    expect(technician.status).toBe(201);
    expect(technician.body.data.usuario.passwordHash).toBeUndefined();
    expect(technician.body.data.especialidades[0].especialidadId).toBe(specialtyId);

    const invalidTechnician = await api().post('/api/tecnicos')
      .set('Authorization', bearer(adminToken))
      .send({
        nombre: 'Técnico inválido',
        email: 'tecnico-invalido@test.local',
        password: 'password-segura',
        especialidadIds: [99999],
      });
    expect(invalidTechnician.status).toBe(422);
    expect(invalidTechnician.body.error.code).toBe('ESPECIALIDAD_INVALIDA');

    const deletion = await api().delete(`/api/especialidades/${specialtyId}`)
      .set('Authorization', bearer(adminToken));
    expect(deletion.status).toBe(409);
    expect(deletion.body.error.code).toBe('EN_USO');
  });

  it('rechaza operaciones de escritura de catálogos para clientes autenticados', async () => {
    const response = await api().post('/api/especialidades')
      .set('Authorization', bearer(clienteToken))
      .send({ nombre: 'No permitido' });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('SIN_PERMISO');
  });
});
