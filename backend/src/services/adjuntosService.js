import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { AppError } from '../utils/AppError.js';
import * as repository from '../repositories/solicitudesRepository.js';
import { buscarVisible } from './solicitudesService.js';

export const CARPETA = fileURLToPath(new URL('../../uploads/', import.meta.url));
export const TIPOS_PERMITIDOS = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'text/plain'];
export const MAX_BYTES = 5 * 1024 * 1024;
export const MAX_ADJUNTOS = 5;

const rechazo = (code, mensaje) => new AppError(422, code, mensaje);
const presentar = (a) => ({ id: a.id, nombre: a.nombreOriginal, mime: a.mime, tamano: a.tamano, subidoPor: a.usuario.nombre, createdAt: a.createdAt });

export async function listar(id, usuario) {
  await buscarVisible(id, usuario);
  return (await repository.listarAdjuntos(id)).map(presentar);
}

// El archivo se guarda con un nombre aleatorio: el nombre original es solo un dato y nunca forma la ruta.
export async function subir(id, { nombre, mime, contenido }, usuario) {
  const solicitud = await buscarVisible(id, usuario);
  if (['cerrada', 'cancelada'].includes(solicitud.estado.codigo)) {
    throw new AppError(409, 'ESTADO_NO_PERMITE_ADJUNTOS', 'No se pueden adjuntar archivos a una solicitud cerrada o cancelada');
  }
  if (!TIPOS_PERMITIDOS.includes(mime)) throw rechazo('TIPO_NO_PERMITIDO', 'Solo se aceptan PDF, PNG, JPG, WEBP o TXT');
  if (!contenido?.length) throw rechazo('ARCHIVO_VACIO', 'El archivo está vacío');
  if (await repository.contarAdjuntos(id) >= MAX_ADJUNTOS) throw rechazo('LIMITE_ADJUNTOS', `Una solicitud admite hasta ${MAX_ADJUNTOS} adjuntos`);

  const ruta = randomUUID();
  await mkdir(CARPETA, { recursive: true });
  await writeFile(CARPETA + ruta, contenido);
  return presentar(await repository.crearAdjunto({ solicitudId: id, nombreOriginal: nombre, ruta, mime, tamano: contenido.length, subidoPor: usuario.id }));
}

export async function obtenerArchivo(id, adjuntoId, usuario) {
  await buscarVisible(id, usuario);
  const adjunto = await repository.buscarAdjunto(adjuntoId, id);
  if (!adjunto) throw new AppError(404, 'NO_ENCONTRADO', 'Adjunto no encontrado');
  return { ruta: CARPETA + adjunto.ruta, nombre: adjunto.nombreOriginal, mime: adjunto.mime };
}
