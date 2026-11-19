import { AppError } from '../utils/AppError.js';

export const validate = (schema, source = 'body') => (req, res, next) => {
  const parsed = schema.safeParse(req[source]);
  if (!parsed.success) {
    return next(new AppError(422, 'VALIDACION', 'Datos inválidos', parsed.error.issues.map((issue) => ({ campo: issue.path.join('.'), mensaje: issue.message }))));
  }
  // Express 5 expone req.query como getter; no se reasigna. Los controladores
  // usan sus valores originales y paginar() se encarga de convertir page/limit.
  if (source !== 'query') req[source] = parsed.data;
  return next();
};
