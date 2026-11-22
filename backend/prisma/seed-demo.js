// Datos de demostración: usuarios de cada rol, catálogos y ~40 solicitudes con
// historial, asignaciones y notificaciones coherentes con la máquina de estados
// (docs/tecnico/03-estados-y-reglas.md). Sirven para probar a mano y para que el
// dashboard tenga datos. Se ejecuta con `npm run seed:demo`, después del seed base.
//
// - Es reproducible: usa un generador pseudoaleatorio con semilla fija.
// - Es idempotente: los usuarios y catálogos se crean solo si faltan, y las
//   solicitudes solo si la tabla está vacía.
// - Nunca se ejecuta con NODE_ENV=production.
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

if (process.env.NODE_ENV === 'production') {
  console.error('seed:demo crea cuentas con una contraseña conocida y no se ejecuta en producción.');
  process.exit(1);
}

const prisma = new PrismaClient();
const PASSWORD_DEMO = process.env.DEMO_PASSWORD || 'ServiGest2026';
const HORA = 60 * 60 * 1000;
const DIA = 24 * HORA;

// mulberry32: generador con semilla para que cada ejecución produzca los mismos datos
function generador(semilla) {
  let a = semilla;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const azar = generador(2026);
const entre = (min, max) => min + azar() * (max - min);
const elegir = (lista) => lista[Math.floor(azar() * lista.length)];
const mezclar = (lista) => {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(azar() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
};

const ESPECIALIDADES = ['Redes', 'Hardware', 'Software', 'Electricidad', 'Climatización'];

const CATEGORIAS = [
  { nombre: 'Conectividad', especialidad: 'Redes', casos: [
    ['Switch principal piso 2', 'Sin conexión a internet en todo el piso desde la mañana.'],
    ['Router de la sucursal', 'La conexión se corta cada pocos minutos.'],
  ] },
  { nombre: 'Cableado estructurado', especialidad: 'Redes', casos: [
    ['Rack de comunicaciones', 'Se necesitan 6 puntos de red nuevos para el área de ventas.'],
    ['Patch panel', 'Varios puertos sin enlace después de una remodelación.'],
  ] },
  { nombre: 'Reparación de equipos', especialidad: 'Hardware', casos: [
    ['Laptop de contabilidad', 'El equipo no enciende; el cargador parece funcionar.'],
    ['PC de recepción', 'Pantalla azul al iniciar Windows.'],
  ] },
  { nombre: 'Impresoras', especialidad: 'Hardware', casos: [
    ['Impresora multifunción', 'Atasca papel en cada impresión doble cara.'],
    ['Impresora de etiquetas', 'Imprime con franjas en blanco.'],
  ] },
  { nombre: 'Instalación de software', especialidad: 'Software', casos: [
    ['Equipos del área de diseño', 'Instalar y licenciar la suite ofimática en 5 equipos.'],
    ['Servidor de archivos', 'Actualizar el antivirus corporativo.'],
  ] },
  { nombre: 'Soporte de sistemas', especialidad: 'Software', casos: [
    ['Sistema de facturación', 'Error al generar comprobantes electrónicos.'],
    ['Correo corporativo', 'Los usuarios no reciben correos externos.'],
  ] },
  { nombre: 'Instalación eléctrica', especialidad: 'Electricidad', casos: [
    ['Tablero eléctrico', 'El breaker del área de servidores se dispara con frecuencia.'],
    ['UPS de la oficina', 'La UPS emite alarma y no sostiene la carga.'],
  ] },
  { nombre: 'Aire acondicionado', especialidad: 'Climatización', casos: [
    ['Split del cuarto de servidores', 'La temperatura sube a 30 °C por la tarde.'],
    ['Aire central', 'Gotea agua sobre los escritorios.'],
  ] },
];

const USUARIOS = {
  admin: { nombre: 'Administración Demo', email: 'admin@servigest.test' },
  coordinadores: [
    { nombre: 'Carla Mendoza', email: 'coordinador1@servigest.test' },
    { nombre: 'Luis Andrade', email: 'coordinador2@servigest.test' },
  ],
  tecnicos: [
    { nombre: 'Pedro Salazar', email: 'tecnico1@servigest.test', especialidades: ['Redes', 'Software'] },
    { nombre: 'María Torres', email: 'tecnico2@servigest.test', especialidades: ['Hardware', 'Software'] },
    { nombre: 'Jorge Villacís', email: 'tecnico3@servigest.test', especialidades: ['Electricidad', 'Climatización'] },
    { nombre: 'Ana Quiñónez', email: 'tecnico4@servigest.test', especialidades: ['Redes', 'Hardware'] },
    // No disponible: solo aparece en solicitudes ya atendidas.
    { nombre: 'Diego Paredes', email: 'tecnico5@servigest.test', especialidades: ['Climatización', 'Electricidad'], disponible: false },
  ],
  clientes: [
    { nombre: 'Rosa Cedeño', email: 'cliente1@servigest.test', razonSocial: 'Comercial El Puerto S.A.', ruc: '0991234567001',
      sedes: [['Matriz', 'Av. 9 de Octubre 100, Guayaquil'], ['Bodega norte', 'Km 10 vía Daule']] },
    { nombre: 'Andrés Murillo', email: 'cliente2@servigest.test', razonSocial: 'Clínica Santa Ana', ruc: '0992345678001',
      sedes: [['Edificio principal', 'Cdla. Kennedy Norte'], ['Consultorios Samborondón', 'Km 2.5 vía Samborondón']] },
    { nombre: 'Gabriela Franco', email: 'cliente3@servigest.test', razonSocial: 'Colegio Nuevo Horizonte', ruc: '0993456789001',
      sedes: [['Campus Ceibos', 'Los Ceibos, Av. del Bombero'], ['Sección inicial', 'Urdesa Central']] },
    { nombre: 'Héctor Bustamante', email: 'cliente4@servigest.test', razonSocial: 'Logística Costa Ltda.', ruc: '0994567890001',
      sedes: [['Oficina central', 'Puerto Santa Ana'], ['Centro de distribución', 'Vía Perimetral km 24']] },
  ],
};

// Estados finales de las 40 solicitudes (suma 40). Las abiertas son recientes para
// que haya mezcla de plazos a tiempo, por vencer y vencidos.
const DISTRIBUCION = {
  registrada: 4, aprobada: 4, asignada: 4, en_proceso: 5, pendiente_info: 3,
  resuelta: 5, cerrada: 12, cancelada: 3,
};
const ACTIVOS = ['asignada', 'en_proceso', 'pendiente_info'];

async function usuario(rolId, datos, passwordHash) {
  const email = datos.email.toLowerCase();
  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) return existente;
  return prisma.usuario.create({
    data: { rolId, nombre: datos.nombre, email, passwordHash, debeCambiarPassword: false, activo: true },
  });
}

async function catalogoPorNombre(modelo, nombre, data) {
  const existente = await prisma[modelo].findFirst({ where: { nombre: { equals: nombre, mode: 'insensitive' } } });
  return existente ?? prisma[modelo].create({ data: { nombre, ...data } });
}

async function prepararActores() {
  const roles = Object.fromEntries((await prisma.rol.findMany()).map((r) => [r.nombre, r.id]));
  if (Object.keys(roles).length < 4) throw new Error('Faltan roles: ejecuta primero `npm run seed`.');
  const passwordHash = await bcrypt.hash(PASSWORD_DEMO, 10);

  const especialidades = {};
  for (const nombre of ESPECIALIDADES) especialidades[nombre] = await catalogoPorNombre('especialidad', nombre, {});
  const categorias = [];
  for (const c of CATEGORIAS) {
    const categoria = await catalogoPorNombre('categoria', c.nombre, { especialidadId: especialidades[c.especialidad].id });
    categorias.push({ ...categoria, casos: c.casos });
  }

  await usuario(roles.admin, USUARIOS.admin, passwordHash);
  const coordinadores = [];
  for (const c of USUARIOS.coordinadores) coordinadores.push(await usuario(roles.coordinador, c, passwordHash));

  const tecnicos = [];
  for (const t of USUARIOS.tecnicos) {
    const u = await usuario(roles.tecnico, t, passwordHash);
    const tecnico = await prisma.tecnico.upsert({
      where: { usuarioId: u.id },
      update: {},
      create: {
        usuarioId: u.id,
        disponible: t.disponible ?? true,
        cargaMax: 5,
        especialidades: { create: t.especialidades.map((e) => ({ especialidadId: especialidades[e].id })) },
      },
      include: { especialidades: true },
    });
    tecnicos.push({ ...tecnico, usuario: u, especialidadIds: tecnico.especialidades.map((e) => e.especialidadId) });
  }

  const clientes = [];
  for (const c of USUARIOS.clientes) {
    const u = await usuario(roles.cliente, c, passwordHash);
    const cliente = await prisma.cliente.upsert({
      where: { usuarioId: u.id },
      update: {},
      create: {
        usuarioId: u.id,
        razonSocial: c.razonSocial,
        ruc: c.ruc,
        sedes: { create: c.sedes.map(([nombre, direccion]) => ({ nombre, direccion })) },
      },
      include: { sedes: true },
    });
    clientes.push({ ...cliente, usuario: u });
  }

  const prioridades = await prisma.prioridad.findMany({ where: { activo: true } });
  if (prioridades.length === 0) throw new Error('Faltan prioridades: ejecuta primero `npm run seed`.');
  const estados = Object.fromEntries((await prisma.estado.findMany()).map((e) => [e.codigo, e.id]));

  return { categorias, coordinadores, tecnicos, clientes, prioridades, estados };
}

// Recorrido por la máquina de estados hasta llegar al estado final pedido.
function recorrido(final, conPendiente) {
  if (final === 'cancelada') return azar() < 0.5 ? ['registrada', 'cancelada'] : ['registrada', 'aprobada', 'cancelada'];
  const camino = ['registrada', 'aprobada', 'asignada', 'en_proceso'];
  if (conPendiente || final === 'pendiente_info') camino.push('pendiente_info', 'en_proceso');
  camino.push('resuelta', 'cerrada');
  const corte = final === 'en_proceso' ? camino.indexOf('en_proceso') : camino.lastIndexOf(final);
  return camino.slice(0, corte + 1);
}

function planificar(actores) {
  const ahora = Date.now();
  const finales = mezclar(Object.entries(DISTRIBUCION).flatMap(([estado, n]) => Array(n).fill(estado)));
  const carga = new Map(actores.tecnicos.map((t) => [t.id, 0]));

  return finales.map((final) => {
    const prioridad = elegir(actores.prioridades);
    const plazo = prioridad.horasSla * HORA;
    const abierta = !['resuelta', 'cerrada', 'cancelada'].includes(final);
    // Abiertas: creadas hace entre 10 % y 150 % de su plazo. Atendidas: hasta 60 días atrás.
    const creada = abierta ? ahora - entre(0.1, 1.5) * plazo : ahora - entre(2, 60) * DIA;

    // Categoría con al menos un técnico disponible que tenga la especialidad y cupo
    let categoria;
    let candidatos = [];
    for (const c of mezclar(actores.categorias)) {
      candidatos = actores.tecnicos.filter((t) => t.especialidadIds.includes(c.especialidadId)
        && (!ACTIVOS.includes(final) || (t.disponible && carga.get(t.id) < t.cargaMax)));
      if (candidatos.length) { categoria = c; break; }
    }
    const tecnico = elegir(candidatos);
    if (ACTIVOS.includes(final)) carga.set(tecnico.id, carga.get(tecnico.id) + 1);
    const otro = candidatos.find((t) => t.id !== tecnico.id && t.disponible);

    const cliente = elegir(actores.clientes);
    const [equipo, descripcion] = elegir(categoria.casos);
    return {
      final, prioridad, plazo, creada, categoria, tecnico, cliente, equipo, descripcion,
      sede: elegir(cliente.sedes),
      coordinador: elegir(actores.coordinadores),
      creador: azar() < 0.75 ? cliente.usuario : elegir(actores.coordinadores),
      camino: recorrido(final, azar() < 0.35),
      // Algunas asignaciones tuvieron una reasignación justificada
      reasignadaDesde: otro && azar() < 0.2 ? otro : null,
    };
  }).sort((a, b) => a.creada - b.creada);
}

const COMENTARIOS = {
  pendiente_info: 'Se necesita el número de serie y una foto de la etiqueta del equipo.',
  en_proceso_cliente: 'Adjunto la información solicitada.',
  cancelada: 'El cliente resolvió el problema por su cuenta.',
};
const RESOLUCIONES = [
  'Se reemplazó el componente defectuoso y se verificó el funcionamiento con el usuario.',
  'Se reconfiguró el equipo y se documentaron los parámetros en la ficha técnica.',
  'Se corrigió la instalación y se dejaron recomendaciones de uso.',
];

async function crearSolicitud(p, numero, actores) {
  const { estados } = actores;
  const ahora = Date.now();
  // Repartir las transiciones entre la creación y "ahora" (o hasta ~1.3 plazos para las atendidas)
  const fin = Math.min(ahora - 5 * 60 * 1000, p.creada + entre(0.3, 1.4) * p.plazo + (p.final === 'cerrada' ? entre(2, 24) * HORA : 0));
  const paso = (fin - p.creada) / Math.max(1, p.camino.length - 1);
  const fechas = p.camino.map((_, i) => new Date(p.creada + i * paso));

  const resuelta = p.camino.includes('resuelta');
  const cerrada = p.camino.includes('cerrada');
  const resolucion = resuelta ? elegir(RESOLUCIONES) : null;
  const codigo = `SOL-${new Date(p.creada).getFullYear()}-${String(numero).padStart(6, '0')}`;

  await prisma.$transaction(async (tx) => {
    const solicitud = await tx.solicitud.create({
      data: {
        codigo,
        clienteId: p.cliente.id,
        sedeId: p.sede.id,
        categoriaId: p.categoria.id,
        prioridadId: p.prioridad.id,
        estadoId: estados[p.final],
        tecnicoActualId: p.camino.includes('asignada') ? p.tecnico.id : null,
        creadoPor: p.creador.id,
        equipo: p.equipo,
        descripcion: p.descripcion,
        resolucion,
        fechaLimite: new Date(p.creada + p.plazo),
        createdAt: fechas[0],
        resolvedAt: resuelta ? fechas[p.camino.indexOf('resuelta')] : null,
        closedAt: cerrada ? fechas[p.camino.indexOf('cerrada')] : null,
        version: p.camino.length,
      },
    });

    const notificar = (usuarioId, tipo, mensaje, fecha) => ({
      usuarioId, solicitudId: solicitud.id, tipo, mensaje, createdAt: fecha,
      leida: ahora - fecha.getTime() > 3 * DIA,
    });
    const notificaciones = actores.coordinadores.map((c) => notificar(c.id, 'registro', `Nueva solicitud ${codigo}`, fechas[0]));
    const historial = [{ solicitudId: solicitud.id, estadoAnteriorId: null, estadoNuevoId: estados.registrada, usuarioId: p.creador.id, createdAt: fechas[0] }];

    for (let i = 1; i < p.camino.length; i += 1) {
      const anterior = p.camino[i - 1];
      const nuevo = p.camino[i];
      const fecha = fechas[i];
      let usuarioId = p.coordinador.id;
      let comentario = null;

      if (nuevo === 'asignada') {
        if (p.reasignadaDesde) {
          // Primera asignación a otro técnico, luego reasignación justificada
          await tx.asignacion.create({ data: { solicitudId: solicitud.id, tecnicoId: p.reasignadaDesde.id, asignadoPor: p.coordinador.id, activa: false, createdAt: fecha } });
          await tx.asignacion.create({ data: {
            solicitudId: solicitud.id, tecnicoId: p.tecnico.id, asignadoPor: p.coordinador.id, activa: true,
            justificacion: 'Reasignada por cambio en la carga de trabajo del técnico anterior.',
            createdAt: new Date(fecha.getTime() + paso / 2),
          } });
          notificaciones.push(notificar(p.reasignadaDesde.usuario.id, 'asignacion', `Se le retiró la solicitud ${codigo}`, fecha));
        } else {
          await tx.asignacion.create({ data: { solicitudId: solicitud.id, tecnicoId: p.tecnico.id, asignadoPor: p.coordinador.id, activa: true, createdAt: fecha } });
        }
        notificaciones.push(notificar(p.tecnico.usuario.id, 'asignacion', `Se le asignó la solicitud ${codigo}`, fecha));
        notificaciones.push(notificar(p.cliente.usuario.id, 'asignacion', `Su solicitud ${codigo} fue asignada a un técnico`, fecha));
      } else if (nuevo === 'en_proceso' && anterior === 'pendiente_info') {
        usuarioId = p.cliente.usuario.id;
        comentario = COMENTARIOS.en_proceso_cliente;
        notificaciones.push(notificar(p.tecnico.usuario.id, 'cambio_estado', `El cliente respondió en ${codigo}`, fecha));
      } else if (['en_proceso', 'pendiente_info', 'resuelta'].includes(nuevo)) {
        usuarioId = p.tecnico.usuario.id;
        if (nuevo === 'pendiente_info') {
          comentario = COMENTARIOS.pendiente_info;
          notificaciones.push(notificar(p.cliente.usuario.id, 'solicitud_info', `Se necesita información en ${codigo}`, fecha));
        }
        if (nuevo === 'resuelta') comentario = resolucion;
      } else if (nuevo === 'aprobada') {
        notificaciones.push(notificar(p.cliente.usuario.id, 'cambio_estado', `Su solicitud ${codigo} fue aprobada`, fecha));
      } else if (nuevo === 'cancelada') {
        comentario = COMENTARIOS.cancelada;
        notificaciones.push(notificar(p.cliente.usuario.id, 'cambio_estado', `La solicitud ${codigo} fue cancelada`, fecha));
      } else if (nuevo === 'cerrada') {
        notificaciones.push(notificar(p.cliente.usuario.id, 'cierre', `Su solicitud ${codigo} fue cerrada`, fecha));
      }

      historial.push({ solicitudId: solicitud.id, estadoAnteriorId: estados[anterior], estadoNuevoId: estados[nuevo], usuarioId, comentario, createdAt: fecha });
    }

    await tx.historialEstado.createMany({ data: historial });
    await tx.notificacion.createMany({ data: notificaciones });
  });
}

async function seedDemo() {
  const actores = await prepararActores();
  if (await prisma.solicitud.count()) {
    console.info('Ya existen solicitudes: se mantienen. Usuarios y catálogos de demostración verificados.');
    return;
  }
  const planes = planificar(actores);
  const porAnio = new Map();
  for (const plan of planes) {
    const anio = new Date(plan.creada).getFullYear();
    porAnio.set(anio, (porAnio.get(anio) ?? 0) + 1);
    await crearSolicitud(plan, porAnio.get(anio), actores);
  }
  console.info(`Datos de demostración listos: ${planes.length} solicitudes.`);
  console.info(`Cuentas *@servigest.test (admin, coordinador1-2, tecnico1-5, cliente1-4) con la contraseña ${process.env.DEMO_PASSWORD ? 'de DEMO_PASSWORD' : `"${PASSWORD_DEMO}"`}.`);
}

seedDemo()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
