import { describe, expect, it } from 'vitest';
import { problemaAdjunto } from './solicitudes';

const archivo = (nombre: string, tipo: string, bytes: number) => new File([new Uint8Array(bytes)], nombre, { type: tipo });

describe('problemaAdjunto', () => {
  it('acepta los tipos permitidos dentro del tamaño y del límite', () => {
    expect(problemaAdjunto(archivo('informe.pdf', 'application/pdf', 1000), 0)).toBe('');
    expect(problemaAdjunto(archivo('foto.jpg', 'image/jpeg', 1000), 4)).toBe('');
  });

  it('rechaza tipos no permitidos, archivos de más de 5 MB y el sexto adjunto', () => {
    expect(problemaAdjunto(archivo('app.exe', 'application/x-msdownload', 10), 0)).toContain('solo se aceptan');
    expect(problemaAdjunto(archivo('grande.pdf', 'application/pdf', 5 * 1024 * 1024 + 1), 0)).toContain('supera los 5 MB');
    expect(problemaAdjunto(archivo('nota.txt', 'text/plain', 10), 5)).toContain('hasta 5 adjuntos');
  });
});
