import jwt from 'jsonwebtoken';
import { buscarUsuario } from '../repositories/authRepository.js';
import { AppError } from '../utils/AppError.js';

export async function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError(401, 'NO_AUTENTICADO', 'Debes iniciar sesión para continuar'));
  }

  let payload;
  try {
    payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError(401, 'TOKEN_INVALIDO', 'El token no es válido o venció'));
    }
    return next(error);
  }

  const id = Number(payload.sub);
  if (!Number.isSafeInteger(id) || id < 1) {
    return next(new AppError(401, 'TOKEN_INVALIDO', 'El token no es válido o venció'));
  }
  const usuario = await buscarUsuario(id);
  if (!usuario || !usuario.activo || (usuario.cliente && !usuario.cliente.activo)) {
    return next(new AppError(401, 'CUENTA_INACTIVA', 'Tu cuenta no está activa'));
  }
  req.usuario = {
    id: usuario.id,
    rol: usuario.rol.nombre,
    clienteId: usuario.cliente?.id,
    tecnicoId: usuario.tecnico?.id,
    debeCambiarPassword: usuario.debeCambiarPassword,
  };

  const path = req.originalUrl.split('?')[0];
  // Una contraseña temporal solo permite completar el perfil y cerrar sesión.
  const permitidoDuranteCambio = (path === '/api/auth/me' && ['GET', 'PATCH'].includes(req.method))
    || (path === '/api/auth/logout' && req.method === 'POST');
  if (usuario.debeCambiarPassword && !permitidoDuranteCambio) {
    return next(new AppError(403, 'CAMBIO_PASSWORD_REQUERIDO', 'Debes cambiar tu contraseña temporal'));
  }
  return next();
}
