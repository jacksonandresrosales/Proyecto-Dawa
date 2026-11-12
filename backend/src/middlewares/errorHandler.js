import { AppError } from '../utils/AppError.js';

// Único lugar que escribe respuestas de error.
// eslint-disable-next-line no-unused-vars -- Express reconoce el manejador de errores por sus 4 parámetros
export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'JSON_INVALIDO', message: 'El cuerpo no es JSON válido' } });
  }
  // Inesperado: el detalle va al log, nunca al cliente
  console.error(err);
  res.status(500).json({ error: { code: 'ERROR_INTERNO', message: 'Ocurrió un error inesperado' } });
}
