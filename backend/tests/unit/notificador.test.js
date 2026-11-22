import { describe, expect, it, vi } from 'vitest';
import { emitir, suscribir } from '../../src/services/notificador.js';

describe('notificador', () => {
  it('entrega cada aviso solo a su destinatario y deja de entregar al cancelar', () => {
    const ana = vi.fn();
    const luis = vi.fn();
    const cancelarAna = suscribir(1, ana);
    suscribir(2, luis);

    emitir([{ usuarioId: 1, tipo: 'cambio_estado', mensaje: 'Solicitud SOL-2026-000001: aprobada' }], 7);
    expect(ana).toHaveBeenCalledWith({ tipo: 'cambio_estado', mensaje: 'Solicitud SOL-2026-000001: aprobada', solicitudId: 7 });
    expect(luis).not.toHaveBeenCalled();

    cancelarAna();
    emitir([{ usuarioId: 1, tipo: 'cierre', mensaje: 'x' }], 7);
    expect(ana).toHaveBeenCalledTimes(1);
  });
});
