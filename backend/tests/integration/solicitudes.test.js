import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it } from 'vitest';
import { app } from '../../src/app.js';
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

  it('edita las sedes de un cliente con solicitudes sin romper las existentes', async () => {
    const { body } = await api().post('/api/solicitudes').set(bearer('clienteA')).send(nueva(ids.sedeA));
    const editado = await api().patch(`/api/clientes/${ids.clienteA}`).set(bearer('coordinador'))
      .send({ sedes: [{ nombre: 'Sucursal', direccion: 'Vía Daule' }] });
    expect(editado.status).toBe(200);
    expect(editado.body.data.sedes.map((s) => s.nombre)).toEqual(['Sucursal']);
    // La sede quitada queda desactivada y la solicitud la sigue referenciando.
    expect(await prisma.sede.findUnique({ where: { id: ids.sedeA } })).toMatchObject({ activo: false });
    expect((await api().get(`/api/solicitudes/${body.data.id}`).set(bearer('clienteA'))).body.data.sede.id).toBe(ids.sedeA);
    expect((await api().post('/api/solicitudes').set(bearer('clienteA')).send(nueva(ids.sedeA))).body.error.code).toBe('SEDE_INVALIDA');

    const restaurada = await api().patch(`/api/clientes/${ids.clienteA}`).set(bearer('coordinador'))
      .send({ sedes: [{ nombre: 'Matriz', direccion: 'Centro nuevo' }, { nombre: 'Sucursal', direccion: 'Vía Daule' }] });
    expect(restaurada.body.data.sedes).toEqual(expect.arrayContaining([expect.objectContaining({ id: ids.sedeA, direccion: 'Centro nuevo' })]));
  });

  it('impide que el técnico vea o cambie solicitudes que no tiene asignadas', async () => {
    const { body } = await api().post('/api/solicitudes').set(bearer('clienteA')).send(nueva(ids.sedeA));
    expect((await api().get(`/api/solicitudes/${body.data.id}`).set(bearer('tecnico'))).status).toBe(404);
    expect((await cambiar(body.data.id, 'tecnico', { estado: 'en_proceso', version: 1 })).status).toBe(404);
    expect((await api().post('/api/solicitudes').set(bearer('tecnico')).send(nueva(ids.sedeA))).status).toBe(403);
  });
});

describe('notificaciones', () => {
  it('lista solo las propias, cuenta las no leídas y permite marcarlas', async () => {
    const { body } = await api().post('/api/solicitudes').set(bearer('clienteA')).send(nueva(ids.sedeA));
    await cambiar(body.data.id, 'coordinador', { estado: 'aprobada', version: 1 });

    const delCoordinador = await api().get('/api/notificaciones').set(bearer('coordinador'));
    expect(delCoordinador.body.data).toEqual([expect.objectContaining({ tipo: 'registro', solicitudId: body.data.id, leida: false })]);

    const delCliente = await api().get('/api/notificaciones?leida=false').set(bearer('clienteA'));
    expect(delCliente.body.meta.noLeidas).toBe(1);
    const [aviso] = delCliente.body.data;
    expect(aviso).toMatchObject({ tipo: 'cambio_estado', solicitudId: body.data.id });

    // Una notificación ajena se trata como inexistente.
    expect((await api().patch(`/api/notificaciones/${aviso.id}/leida`).set(bearer('coordinador'))).status).toBe(404);
    expect((await api().patch(`/api/notificaciones/${aviso.id}/leida`).set(bearer('clienteA'))).status).toBe(204);
    expect((await api().get('/api/notificaciones').set(bearer('clienteA'))).body.meta.noLeidas).toBe(0);

    const todas = await api().patch('/api/notificaciones/leidas').set(bearer('coordinador'));
    expect(todas.body.data.actualizadas).toBe(1);
  });

  it('envía el aviso en vivo por SSE sin recargar', async () => {
    const { body } = await api().post('/api/solicitudes').set(bearer('clienteA')).send(nueva(ids.sedeA));
    const server = app.listen(0);
    const { port } = server.address();
    const corte = new AbortController();
    try {
      const respuesta = await fetch(`http://127.0.0.1:${port}/api/notificaciones/stream`, { headers: bearer('clienteA'), signal: corte.signal });
      expect(respuesta.headers.get('content-type')).toContain('text/event-stream');
      const lector = respuesta.body.getReader();
      const decoder = new TextDecoder();
      let texto = decoder.decode((await lector.read()).value); // ": conectado"

      await cambiar(body.data.id, 'coordinador', { estado: 'aprobada', version: 1 });
      while (!texto.includes('event: notificacion')) texto += decoder.decode((await lector.read()).value);
      const datos = JSON.parse(texto.split('event: notificacion\ndata: ')[1].split('\n')[0]);
      expect(datos).toMatchObject({ tipo: 'cambio_estado', solicitudId: body.data.id });
    } finally {
      corte.abort();
      server.close();
    }
  });
});

describe('dashboard', () => {
  it('calcula los indicadores desde la base y respeta los filtros y los roles', async () => {
    const { body } = await api().post('/api/solicitudes').set(bearer('clienteA')).send(nueva(ids.sedeA));
    await cambiar(body.data.id, 'coordinador', { estado: 'aprobada', version: 1 });
    await api().post(`/api/solicitudes/${body.data.id}/asignaciones`).set(bearer('coordinador')).send({ tecnicoId: ids.tecnico });

    const r = await api().get('/api/dashboard/indicadores').set(bearer('coordinador'));
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ total: 1, abiertas: 1, vencidas: 0, cumplimientoPlazo: null });
    expect(r.body.data.porEstado.find((e) => e.estado === 'asignada').cantidad).toBe(1);
    expect(r.body.data.cargaPorTecnico).toEqual([expect.objectContaining({ tecnicoId: ids.tecnico, activas: 1, cargaMax: 5 })]);
    expect(r.body.data.evolucion.at(-1).creadas).toBe(1);

    const otroCliente = await api().get(`/api/dashboard/indicadores?cliente=${ids.clienteA + 1}`).set(bearer('coordinador'));
    expect(otroCliente.body.data.total).toBe(0);
    expect((await api().get('/api/dashboard/indicadores?desde=ayer').set(bearer('coordinador'))).status).toBe(422);
    expect((await api().get('/api/dashboard/indicadores').set(bearer('clienteA'))).status).toBe(403);
  });
});

describe('adjuntos y carga de técnicos', () => {
  const subir = (id, rol, contenido, tipo = 'application/pdf', nombre = 'informe.pdf') =>
    api().post(`/api/solicitudes/${id}/adjuntos?nombre=${encodeURIComponent(nombre)}`).set(bearer(rol)).set('Content-Type', tipo).send(contenido);

  it('sube, lista y descarga adjuntos con sus validaciones', async () => {
    const { body } = await api().post('/api/solicitudes').set(bearer('clienteA')).send(nueva(ids.sedeA));
    const id = body.data.id;

    const subido = await subir(id, 'clienteA', Buffer.from('%PDF-1.4 prueba'));
    expect(subido.status).toBe(201);
    expect(subido.body.data).toMatchObject({ nombre: 'informe.pdf', mime: 'application/pdf', tamano: 15 });

    expect((await subir(id, 'clienteA', Buffer.from('MZ'), 'application/x-msdownload', 'virus.exe')).body.error.code).toBe('TIPO_NO_PERMITIDO');
    expect((await subir(id, 'clienteA', Buffer.alloc(6 * 1024 * 1024, 1))).status).toBe(413);
    expect((await subir(id, 'clienteB', Buffer.from('x'), 'text/plain', 'a.txt')).status).toBe(404); // regla 3
    expect((await subir(id, 'tecnico', Buffer.from('x'), 'text/plain', 'a.txt')).status).toBe(403);

    const lista = await api().get(`/api/solicitudes/${id}/adjuntos`).set(bearer('coordinador'));
    expect(lista.body.data).toHaveLength(1);
    const descarga = await api().get(`/api/solicitudes/${id}/adjuntos/${subido.body.data.id}`).set(bearer('coordinador')).buffer(true).parse((res, cb) => {
      const partes = []; res.on('data', (c) => partes.push(c)); res.on('end', () => cb(null, Buffer.concat(partes)));
    });
    expect(descarga.headers['content-disposition']).toContain('attachment');
    expect(descarga.body.toString()).toBe('%PDF-1.4 prueba');

    for (let i = 0; i < 4; i += 1) await subir(id, 'clienteA', Buffer.from(`nota ${i}`), 'text/plain', `nota${i}.txt`);
    expect((await subir(id, 'clienteA', Buffer.from('sexta'), 'text/plain', 'sexta.txt')).body.error.code).toBe('LIMITE_ADJUNTOS');
  });

  it('muestra la carga actual de cada técnico con sus solicitudes activas', async () => {
    const { body } = await api().post('/api/solicitudes').set(bearer('clienteA')).send(nueva(ids.sedeA));
    await cambiar(body.data.id, 'coordinador', { estado: 'aprobada', version: 1 });
    await api().post(`/api/solicitudes/${body.data.id}/asignaciones`).set(bearer('coordinador')).send({ tecnicoId: ids.tecnico });

    const carga = await api().get('/api/tecnicos/carga').set(bearer('coordinador'));
    expect(carga.status).toBe(200);
    expect(carga.body.data).toEqual([expect.objectContaining({
      id: ids.tecnico, cargaMax: 5, especialidades: [expect.objectContaining({ nombre: 'Redes' })],
      activas: [expect.objectContaining({ id: body.data.id, estado: 'asignada' })],
    })]);
    expect((await api().get('/api/tecnicos/carga').set(bearer('tecnico'))).status).toBe(403);
  });
});
