import { AppError } from '../utils/AppError.js';

// Único lugar que escribe respuestas de error.
// eslint-disable-next-line no-unused-vars -- Express reconoce el manejador de errores por sus 4 parámetros
export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }
  if (err.code === 'P2002') {
    const target = Array.isArray(err.meta?.target) ? err.meta.target : [];
    const campo = target.includes('ruc') ? 'ruc' : target.includes('email') ? 'email' : 'nombre';
    const message = campo === 'ruc'
      ? 'Ya existe un cliente con este RUC'
      : campo === 'email'
        ? 'Ya existe un usuario con este correo'
        : 'Ya existe un registro con este nombre';
    return res.status(409).json({
      error: { code: 'DUPLICADO', message, details: [{ campo, mensaje: message }] },
    });
  }
  if (err.code === 'P2003' || err.code === 'P2014') {
    return res.status(409).json({
      error: { code: 'EN_USO', message: 'El registro tiene relaciones y no puede eliminarse físicamente' },
    });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ error: { code: 'NO_ENCONTRADO', message: 'El registro solicitado no existe' } });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: { code: 'ARCHIVO_DEMASIADO_GRANDE', message: 'El contenido supera el tamaño permitido (5 MB por archivo)' } });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'JSON_INVALIDO', message: 'El cuerpo no es JSON válido' } });
  }
  // Inesperado: el detalle va al log, nunca al cliente
  console.error(err);
  res.status(500).json({ error: { code: 'ERROR_INTERNO', message: 'Ocurrió un error inesperado' } });
}
