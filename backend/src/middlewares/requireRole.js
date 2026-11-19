import { AppError } from '../utils/AppError.js';

export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.usuario?.rol)) {
    return next(new AppError(403, 'SIN_PERMISO', 'No tienes permiso para realizar esta acción'));
  }
  return next();
};
