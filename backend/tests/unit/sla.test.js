import { describe, expect, it } from 'vitest';
import { calcularFechaLimite, estadoPlazo } from '../../src/services/sla.js';

// Regla 6: plazos calculados en el backend con reglas explícitas.
const createdAt = new Date('2026-11-10T08:00:00Z');
const fechaLimite = calcularFechaLimite(createdAt, 10); // 18:00
const en = (hora) => new Date(`2026-11-10T${hora}:00Z`);
const plazo = (extra, ahora) => estadoPlazo({ estado: 'en_proceso', createdAt, fechaLimite, resolvedAt: null, ...extra }, ahora);

describe('sla', () => {
  it('suma las horas de la prioridad a la fecha de creación', () => {
    expect(fechaLimite.toISOString()).toBe('2026-11-10T18:00:00.000Z');
  });

  it('clasifica una solicitud abierta como a tiempo, por vencer o vencida', () => {
    expect(plazo({}, en('15:59'))).toBe('a_tiempo');
    expect(plazo({}, en('16:01'))).toBe('por_vencer'); // queda menos del 20 % (2 h de 10)
    expect(plazo({}, en('18:01'))).toBe('vencida');
  });

  it('juzga las resueltas por su fecha de resolución y excluye las canceladas', () => {
    expect(plazo({ estado: 'cerrada', resolvedAt: en('17:00') }, en('23:00'))).toBe('cumplida');
    expect(plazo({ estado: 'resuelta', resolvedAt: en('19:00') }, en('23:00'))).toBe('incumplida');
    expect(plazo({ estado: 'cancelada' }, en('23:00'))).toBeNull();
  });
});
