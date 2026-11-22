import { describe, expect, it } from 'vitest';
import { calcularIndicadores } from '../../src/services/indicadores.js';

const ahora = new Date('2026-11-20T12:00:00Z');
let id = 0;
const s = (estado, creada, limite, resuelta = null, prioridad = 'Alta', horasSla = 8) => ({
  id: ++id, codigo: `SOL-2026-${String(id).padStart(6, '0')}`, estado: { codigo: estado }, prioridad: { nombre: prioridad, horasSla },
  createdAt: new Date(creada), fechaLimite: new Date(limite), resolvedAt: resuelta && new Date(resuelta),
});

describe('calcularIndicadores', () => {
  const datos = [
    s('cerrada', '2026-11-18T08:00:00Z', '2026-11-18T16:00:00Z', '2026-11-18T12:00:00Z'), // cumplida, 4 h
    s('resuelta', '2026-11-19T08:00:00Z', '2026-11-19T16:00:00Z', '2026-11-19T18:00:00Z'), // incumplida, 10 h
    s('en_proceso', '2026-11-19T08:00:00Z', '2026-11-19T16:00:00Z'), // vencida
    s('asignada', '2026-11-20T10:00:00Z', '2026-11-20T12:20:00Z', null, 'Crítica', 4), // por vencer (quedan 20 min de 140, menos del 20 %)
    s('registrada', '2026-11-20T11:00:00Z', '2026-11-23T11:00:00Z', null, 'Baja', 72), // a tiempo
    s('cancelada', '2026-11-20T09:00:00Z', '2026-11-20T17:00:00Z'), // no cuenta para el plazo
  ];
  const r = calcularIndicadores(datos, { desde: '2026-11-18', hasta: '2026-11-20' }, ahora);

  it('cuenta total, abiertas, vencidas y por vencer con las reglas de plazo', () => {
    expect(r).toMatchObject({ total: 6, abiertas: 3, vencidas: 1, porVencer: 1 });
  });

  it('calcula cumplimiento y tiempo promedio solo sobre las resueltas', () => {
    expect(r.cumplimientoPlazo).toBe(0.5);
    expect(r.tiempoPromedioResolucionHoras).toBe(7);
  });

  it('agrupa por estado (los 8, con ceros) y por prioridad de la más urgente a la menos', () => {
    expect(r.porEstado).toHaveLength(8);
    expect(r.porEstado.find((e) => e.estado === 'aprobada').cantidad).toBe(0);
    expect(r.porPrioridad.map((p) => p.prioridad)).toEqual(['Crítica', 'Alta', 'Baja']);
  });

  it('arma la evolución por día con ceros y lista las próximas a vencer sin las vencidas', () => {
    expect(r.evolucion).toEqual([
      { fecha: '2026-11-18', creadas: 1, resueltas: 1 },
      { fecha: '2026-11-19', creadas: 2, resueltas: 1 },
      { fecha: '2026-11-20', creadas: 3, resueltas: 0 },
    ]);
    expect(r.proximasAVencer.map((p) => p.fechaLimite.toISOString())).toEqual(['2026-11-20T12:20:00.000Z', '2026-11-23T11:00:00.000Z']);
  });

  it('devuelve indicadores vacíos sin dividir por cero', () => {
    expect(calcularIndicadores([], {}, ahora)).toMatchObject({ total: 0, cumplimientoPlazo: null, tiempoPromedioResolucionHoras: null, evolucion: [{ fecha: '2026-11-20', creadas: 0, resueltas: 0 }] });
  });
});
