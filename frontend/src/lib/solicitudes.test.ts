import { describe, expect, it } from 'vitest';
import { accionesPara, tonoPrioridad } from './solicitudes';

const destinos = (estado: Parameters<typeof accionesPara>[0]['estado'], rol: Parameters<typeof accionesPara>[1]) =>
  accionesPara({ estado }, rol).map((a) => a.estado);

describe('acciones por estado y rol', () => {
  it('muestra a cada rol solo los cambios que la API le permite', () => {
    expect(destinos('registrada', 'coordinador')).toEqual(['aprobada', 'cancelada']);
    expect(destinos('registrada', 'cliente')).toEqual(['cancelada']);
    expect(destinos('registrada', 'tecnico')).toEqual([]);
    expect(destinos('en_proceso', 'tecnico')).toEqual(['resuelta', 'pendiente_info']);
    expect(destinos('pendiente_info', 'cliente')).toEqual(['en_proceso']);
    expect(destinos('cerrada', 'admin')).toEqual(['en_proceso']);
    expect(destinos('cancelada', 'coordinador')).toEqual([]);
  });

  it('pide resolución al resolver y comentario al cancelar o reabrir', () => {
    expect(accionesPara({ estado: 'en_proceso' }, 'tecnico').find((a) => a.estado === 'resuelta')?.pide).toBe('resolucion');
    expect(accionesPara({ estado: 'registrada' }, 'cliente')[0].pide).toBe('comentario');
    expect(accionesPara({ estado: 'cerrada' }, 'coordinador')[0].pide).toBe('comentario');
  });

  it('usa el tono crítico sólido solo para la prioridad crítica', () => {
    expect(tonoPrioridad('Crítica')).toBe('critical');
    expect(tonoPrioridad('Alta')).toBe('review');
    expect(tonoPrioridad('Baja')).toBe('neutral');
  });
});

describe('venceEn', () => {
  const ahora = new Date('2026-11-20T12:00:00Z').getTime();
  it('expresa el plazo restante en minutos, horas o días', async () => {
    const { venceEn } = await import('./solicitudes');
    expect(venceEn('2026-11-20T12:36:00Z', ahora)).toBe('Vence en 36 min');
    expect(venceEn('2026-11-20T17:00:00Z', ahora)).toBe('Vence en 5 h');
    expect(venceEn('2026-11-23T12:00:00Z', ahora)).toBe('Vence en 3 d');
  });
});
