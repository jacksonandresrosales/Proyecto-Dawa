import { describe, it, expect } from 'vitest';
import { paginar } from '../../src/utils/paginacion.js';

describe('paginar', () => {
  it('usa página 1 y límite 10 por defecto', () => {
    expect(paginar({})).toEqual({ page: 1, limit: 10, skip: 0, take: 10 });
  });

  it('calcula el desplazamiento', () => {
    expect(paginar({ page: '3', limit: '20' })).toMatchObject({ skip: 40, take: 20 });
  });

  it('corrige valores inválidos y limita el máximo a 100', () => {
    expect(paginar({ page: '-2', limit: 'abc' })).toMatchObject({ page: 1, limit: 10 });
    expect(paginar({ limit: '5000' }).limit).toBe(100);
  });
});
