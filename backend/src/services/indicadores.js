import { estadoPlazo } from './sla.js';

const ESTADOS = ['registrada', 'aprobada', 'asignada', 'en_proceso', 'pendiente_info', 'resuelta', 'cerrada', 'cancelada'];
const TERMINADAS = ['resuelta', 'cerrada', 'cancelada'];
const DIA = 24 * 60 * 60 * 1000;
const MAX_DIAS = 90;
const dia = (fecha) => fecha.toISOString().slice(0, 10); // días en UTC, igual que los filtros de fecha
const redondear = (valor, decimales) => Math.round(valor * 10 ** decimales) / 10 ** decimales;

// Indicadores del dashboard (5.6) sobre las solicitudes ya filtradas. Función pura: usa las mismas
// reglas de plazo que la lista (sla.js), así el dashboard nunca contradice a una solicitud.
export function calcularIndicadores(solicitudes, { desde, hasta } = {}, ahora = new Date()) {
  const porEstado = Object.fromEntries(ESTADOS.map((estado) => [estado, 0]));
  const porPrioridad = new Map();
  const proximas = [];
  let abiertas = 0, vencidas = 0, porVencer = 0, cumplidas = 0, incumplidas = 0, horasResolucion = 0, resueltas = 0;

  for (const s of solicitudes) {
    const estado = s.estado.codigo;
    porEstado[estado] += 1;
    const prioridad = porPrioridad.get(s.prioridad.nombre) ?? { prioridad: s.prioridad.nombre, horasSla: s.prioridad.horasSla, cantidad: 0 };
    prioridad.cantidad += 1;
    porPrioridad.set(s.prioridad.nombre, prioridad);

    const plazo = estadoPlazo({ estado, createdAt: s.createdAt, fechaLimite: s.fechaLimite, resolvedAt: s.resolvedAt }, ahora);
    if (!TERMINADAS.includes(estado)) {
      abiertas += 1;
      if (plazo === 'vencida') vencidas += 1;
      else proximas.push(s);
      if (plazo === 'por_vencer') porVencer += 1;
    }
    if (plazo === 'cumplida') cumplidas += 1;
    if (plazo === 'incumplida') incumplidas += 1;
    if (s.resolvedAt && estado !== 'cancelada') {
      horasResolucion += (s.resolvedAt - s.createdAt) / (60 * 60 * 1000);
      resueltas += 1;
    }
  }

  return {
    total: solicitudes.length,
    abiertas,
    vencidas,
    porVencer,
    cumplimientoPlazo: cumplidas + incumplidas ? redondear(cumplidas / (cumplidas + incumplidas), 3) : null,
    tiempoPromedioResolucionHoras: resueltas ? redondear(horasResolucion / resueltas, 1) : null,
    porEstado: ESTADOS.map((estado) => ({ estado, cantidad: porEstado[estado] })),
    porPrioridad: [...porPrioridad.values()].sort((a, b) => a.horasSla - b.horasSla).map(({ prioridad, cantidad }) => ({ prioridad, cantidad })),
    evolucion: evolucion(solicitudes, desde, hasta, ahora),
    proximasAVencer: proximas.sort((a, b) => a.fechaLimite - b.fechaLimite).slice(0, 5)
      .map(({ id, codigo, fechaLimite }) => ({ id, codigo, fechaLimite })),
  };
}

// Una fila por día del periodo, con ceros incluidos, para que el gráfico no salte días.
function evolucion(solicitudes, desde, hasta, ahora) {
  const fin = hasta ? new Date(hasta) : new Date(dia(ahora));
  const primera = solicitudes.reduce((min, s) => (s.createdAt < min ? s.createdAt : min), fin);
  let inicio = desde ? new Date(desde) : new Date(dia(primera));
  if ((fin - inicio) / DIA >= MAX_DIAS) inicio = new Date(fin.getTime() - (MAX_DIAS - 1) * DIA);
  const filas = new Map();
  for (let t = inicio.getTime(); t <= fin.getTime(); t += DIA) filas.set(dia(new Date(t)), { fecha: dia(new Date(t)), creadas: 0, resueltas: 0 });
  for (const s of solicitudes) {
    const creada = filas.get(dia(s.createdAt));
    if (creada) creada.creadas += 1;
    const resuelta = s.resolvedAt && filas.get(dia(s.resolvedAt));
    if (resuelta) resuelta.resueltas += 1;
  }
  return [...filas.values()];
}
