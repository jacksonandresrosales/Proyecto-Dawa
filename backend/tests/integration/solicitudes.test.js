import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it } from 'vitest';
import { api } from '../helpers/api.js';
import { limpiarBase, prisma } from '../helpers/db.js';

process.env.JWT_SECRET = 'integration-test-secret';

const ESTADOS = ['registrada', 'aprobada', 'asignada', 'en_proceso', 'pendiente_info', 'resuelta', 'cerrada', 'cancelada'];
let ids;
let tokens;

const bearer = (rol) => ({ Authorization: `Bearer ${tokens[rol]}` });

async function usuario(rolId, email) {
  return prisma.usuario.create({ data: { rolId, nombre: email.split('@')[0], email, passwordHash: 'hash', debeCambiarPassword: false } });
}

beforeEach(async () => {
  await limpiarBase();
  // limpiarBase vacía también los catálogos fijos: se vuelven a crear.
  const roles = {};
  for (const nombre of ['admin', 'coordinador', 'tecnico', 'cliente']) roles[nombre] = (await prisma.rol.create({ data: { nombre } })).id;
  await prisma.estado.createMany({ data: ESTADOS.map((codigo) => ({ codigo, nombre: codigo, esFinal: ['cerrada', 'cancelada'].includes(codigo) })) });

  const especialidad = await prisma.especialidad.create({ data: { nombre: 'Redes' } });
  const categoria = await prisma.categoria.create({ data: { nombre: 'Conectividad', especialidadId: especialidad.id } });
  const prioridad = await prisma.prioridad.create({ data: { nombre: 'Alta', horasSla: 8 } });

  const coordinador = await usuario(roles.coordinador, 'coordinador@test.local');
  const clienteA = await prisma.cliente.create({
    data: { usuarioId: (await usuario(roles.cliente, 'cliente-a@test.local')).id, razonSocial: 'Cliente A', ruc: '0990000000001', sedes: { create: { nombre: 'Matriz', direccion: 'Centro' } } },
    include: { sedes: true },
  });
  const clienteB = await prisma.cliente.create({
    data: { usuarioId: (await usuario(roles.cliente, 'cliente-b@test.local')).id, razonSocial: 'Cliente B', ruc: '0990000000002', sedes: { create: { nombre: 'Matriz', direccion: 'Norte' } } },
    include: { sedes: true },
  });
  const tecnico = await prisma.tecnico.create({
    data: { usuarioId: (await usuario(roles.tecnico, 'tecnico@test.local')).id, especialidades: { create: { especialidadId: especialidad.id } } },
  });

  ids = { categoria: categoria.id, prioridad: prioridad.id, sedeA: clienteA.sedes[0].id, sedeB: clienteB.sedes[0].id, clienteA: clienteA.id, tecnico: tecnico.id, clienteAUsuario: clienteA.usuarioId };
  const firmar = (id) => jwt.sign({ sub: String(id) }, process.env.JWT_SECRET);
  tokens = { coordinador: firmar(coordinador.id), clienteA: firmar(clienteA.usuarioId), clienteB: firmar(clienteB.usuarioId), tecnico: firmar(tecnico.usuarioId) };
});

const nueva = (sedeId) => ({ categoriaId: ids.categoria, prioridadId: ids.prioridad, sedeId, equipo: 'Router piso 2', descripcion: 'Sin conexión desde las 08:00' });
const cambiar = (id, rol, body) => api().patch(`/api/solicitudes/${id}/estado`).set(bearer(rol)).send(body);

describe('solicitudes', () => {
  it('recorre registro, aprobación, asignación, atención y cierre con historial auditado', async () => {
    const creada = await api().post('/api/solicitudes').set(bearer('clienteA')).send(nueva(ids.sedeA));
    expect(creada.status).toBe(201);
    expect(creada.body.data).toMatchObject({ estado: 'registrada', prioridad: 'Alta', estadoPlazo: 'a_tiempo', version: 1, tecnico: null });
    expect(creada.body.data.codigo).toMatch(/^SOL-\d{4}-\d{6}$/);
    const { id } = creada.body.data;

    // Regla 3: otro cliente no la ve, ni en el detalle ni en la lista.
    expect((await api().get(`/api/solicitudes/${id}`).set(bearer('clienteB'))).status).toBe(404);
    expect((await api().get('/api/solicitudes').set(bearer('clienteB'))).body.meta.total).toBe(0);

    expect((await cambiar(id, 'coordinador', { estado: 'aprobada', version: 1 })).body.data.version).toBe(2);
    // Asignar solo se hace por su endpoint, no con un cambio de estado.
    expect((await cambiar(id, 'coordinador', { estado: 'asignada', version: 2 })).body.error.code).toBe('TRANSICION_INVALIDA');

    const asignada = await api().post(`/api/solicitudes/${id}/asignaciones`).set(bearer('coordinador')).send({ tecnicoId: ids.tecnico });
    expect(asignada.status).toBe(201);
    expect(asignada.body.data).toMatchObject({ estado: 'asignada', tecnico: { id: ids.tecnico } });

    expect((await cambiar(id, 'tecnico', { estado: 'en_proceso', version: 3 })).status).toBe(200);
    // Regla 8: una versión vieja no pisa el cambio de otro usuario.
    const vieja = await cambiar(id, 'tecnico', { estado: 'resuelta', resolucion: 'Se cambió el puerto', version: 3 });
    expect(vieja.status).toBe(409);
    expect(vieja.body.error.code).toBe('CONFLICTO_VERSION');

    const resuelta = await cambiar(id, 'tecnico', { estado: 'resuelta', resolucion: 'Se cambió el puerto', version: 4 });
    expect(resuelta.body.data).toMatchObject({ estado: 'resuelta', estadoPlazo: 'cumplida', resolucion: 'Se cambió el puerto' });
    const cerrada = await cambiar(id, 'coordinador', { estado: 'cerrada', version: 5 });
    expect(cerrada.body.data.closedAt).toEqual(expect.any(String));

    const historial = await api().get(`/api/solicitudes/${id}/historial`).set(bearer('clienteA'));
    expect(historial.body.data.map((h) => [h.estadoAnterior, h.estadoNuevo])).toEqual([
      [null, 'registrada'], ['registrada', 'aprobada'], ['aprobada', 'asignada'],
      ['asignada', 'en_proceso'], ['en_proceso', 'resuelta'], ['resuelta', 'cerrada'],
    ]);
    expect(await prisma.notificacion.count({ where: { usuarioId: ids.clienteAUsuario } })).toBeGreaterThan(0);
    // Regla 7: el historial no se puede alterar ni siquiera desde la base.
    await expect(prisma.historialEstado.updateMany({ data: { comentario: 'alterado' } })).rejects.toThrow();
  });

  it('valida la sede del cliente y exige clienteId cuando registra el coordinador', async () => {
    const ajena = await api().post('/api/solicitudes').set(bearer('clienteA')).send(nueva(ids.sedeB));
    expect(ajena.status).toBe(422);
    expect(ajena.body.error.code).toBe('SEDE_INVALIDA');

    const sinCliente = await api().post('/api/solicitudes').set(bearer('coordinador')).send(nueva(ids.sedeA));
    expect(sinCliente.status).toBe(422);
    expect(sinCliente.body.error.details[0].campo).toBe('clienteId');

    const porCoordinador = await api().post('/api/solicitudes').set(bearer('coordinador')).send({ ...nueva(ids.sedeA), clienteId: ids.clienteA });
    expect(porCoordinador.status).toBe(201);
    const lista = await api().get('/api/solicitudes?estado=registrada&q=router').set(bearer('coordinador'));
    expect(lista.body.meta.total).toBe(1);
  });

  it('da al cliente su clienteId y solo sus sedes para registrar', async () => {
    const me = await api().get('/api/auth/me').set(bearer('clienteA'));
    expect(me.body.data.clienteId).toBe(ids.clienteA);
    const propias = await api().get(`/api/clientes/${ids.clienteA}/sedes`).set(bearer('clienteA'));
    expect(propias.body.data).toEqual([expect.objectContaining({ id: ids.sedeA, nombre: 'Matriz' })]);
    expect((await api().get(`/api/clientes/${ids.clienteA}/sedes`).set(bearer('clienteB'))).status).toBe(404);
    expect((await api().get(`/api/clientes/${ids.clienteA}/sedes`).set(bearer('tecnico'))).status).toBe(403);
  });

  it('impide que el técnico vea o cambie solicitudes que no tiene asignadas', async () => {
    const { body } = await api().post('/api/solicitudes').set(bearer('clienteA')).send(nueva(ids.sedeA));
    expect((await api().get(`/api/solicitudes/${body.data.id}`).set(bearer('tecnico'))).status).toBe(404);
    expect((await cambiar(body.data.id, 'tecnico', { estado: 'en_proceso', version: 1 })).status).toBe(404);
    expect((await api().post('/api/solicitudes').set(bearer('tecnico')).send(nueva(ids.sedeA))).status).toBe(403);
  });
});
