import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError.js';
import { generarTokenRestablecimiento, hashTokenRestablecimiento } from '../utils/credenciales.js';
import * as repository from '../repositories/authRepository.js';

const mensajeCredenciales = 'Correo o contraseña incorrectos';
const mensajeRestablecimiento = 'Si el correo está registrado, recibirás instrucciones para recuperar el acceso.';
const errorCredenciales = () => new AppError(401, 'CREDENCIALES_INVALIDAS', mensajeCredenciales);

function usuarioPublico(usuario) {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    telefono: usuario.telefono,
    activo: usuario.activo,
    rol: usuario.rol.nombre,
    debeCambiarPassword: usuario.debeCambiarPassword,
  };
}

function crearSesion(usuario) {
  const token = jwt.sign(
    { rol: usuario.rol.nombre },
    process.env.JWT_SECRET,
    { subject: String(usuario.id), expiresIn: process.env.JWT_EXPIRES_IN || '8h' },
  );
  return { token, usuario: usuarioPublico(usuario) };
}

export async function iniciarSesion({ email, password }) {
  const usuario = await repository.buscarUsuarioPorEmail(email.toLowerCase());
  if (!usuario || !(await bcrypt.compare(password, usuario.passwordHash))) throw errorCredenciales();
  if (!usuario.activo || (usuario.cliente && !usuario.cliente.activo)) throw errorCredenciales();

  return crearSesion(usuario);
}

export async function estadoConfiguracionInicial() {
  if (process.env.NODE_ENV === 'production') return { setupRequired: false };
  return { setupRequired: !(await repository.hayAdministrador()) };
}

export async function crearAdministradorInicial({ nombre, email, password }) {
  if (process.env.NODE_ENV === 'production') {
    // En producción, el primer administrador se provisiona con el seed, no desde una ruta pública.
    throw new AppError(404, 'CONFIGURACION_NO_DISPONIBLE', 'La configuración inicial debe realizarse antes del despliegue');
  }
  if (await repository.hayAdministrador()) {
    throw new AppError(409, 'CONFIGURACION_COMPLETADA', 'La configuración inicial ya fue completada');
  }

  const usuario = await repository.crearAdministradorInicial({
    nombre,
    email: email.toLowerCase(),
    passwordHash: await bcrypt.hash(password, 10),
    debeCambiarPassword: false,
    activo: true,
  });
  if (!usuario) {
    throw new AppError(409, 'CONFIGURACION_COMPLETADA', 'La configuración inicial ya fue completada');
  }
  return crearSesion(usuario);
}

export async function obtenerPerfil(usuarioId) {
  const usuario = await repository.buscarUsuario(usuarioId);
  if (!usuario || !usuario.activo || (usuario.cliente && !usuario.cliente.activo)) {
    throw new AppError(401, 'CUENTA_INACTIVA', 'Tu cuenta no está activa');
  }
  return usuarioPublico(usuario);
}

export async function actualizarPerfil(usuarioId, values) {
  const usuario = await repository.buscarUsuario(usuarioId);
  if (!usuario || !usuario.activo) throw new AppError(401, 'CUENTA_INACTIVA', 'Tu cuenta no está activa');

  const data = {};
  if (values.nombre !== undefined) data.nombre = values.nombre;
  if (values.telefono !== undefined) data.telefono = values.telefono;
  if (values.newPassword) {
    if (!usuario.debeCambiarPassword) {
      const currentPasswordValid = values.currentPassword
        ? await bcrypt.compare(values.currentPassword, usuario.passwordHash)
        : false;
      if (!currentPasswordValid) {
        throw new AppError(422, 'PASSWORD_ACTUAL_INVALIDO', 'La contraseña actual es obligatoria y debe ser correcta');
      }
    }
    data.passwordHash = await bcrypt.hash(values.newPassword, 10);
    data.debeCambiarPassword = false;
  }

  if (Object.keys(data).length === 0) return usuarioPublico(usuario);
  const actualizado = await repository.actualizarUsuario(usuarioId, data);
  return usuarioPublico(actualizado);
}

export async function solicitarRestablecimiento(email) {
  const usuario = await repository.buscarUsuarioPorEmail(email.toLowerCase());
  if (!usuario || !usuario.activo || (usuario.cliente && !usuario.cliente.activo)) return mensajeRestablecimiento;

  const token = generarTokenRestablecimiento();
  const tokenHash = hashTokenRestablecimiento(token);
  const expiraAt = new Date(Date.now() + 30 * 60 * 1000);
  await repository.crearTokenRestablecimiento(usuario.id, tokenHash, expiraAt);

  if (process.env.NODE_ENV !== 'production') {
    const frontend = (process.env.CORS_ORIGIN || 'http://localhost:5173').replace(/\/$/, '');
    console.info(`Enlace de restablecimiento: ${frontend}/restablecer?token=${token}`);
  }
  return mensajeRestablecimiento;
}

export async function restablecerPassword(token, newPassword) {
  const tokenHash = hashTokenRestablecimiento(token);
  const passwordHash = await bcrypt.hash(newPassword, 10);
  const consumido = await repository.consumirTokenRestablecimiento(tokenHash, passwordHash, new Date());
  if (!consumido) {
    throw new AppError(422, 'TOKEN_INVALIDO', 'El enlace no es válido, venció o ya fue utilizado');
  }
  return { message: 'Contraseña actualizada. Ya puedes iniciar sesión.' };
}
