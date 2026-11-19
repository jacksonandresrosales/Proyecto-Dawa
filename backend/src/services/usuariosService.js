import bcrypt from 'bcryptjs';
import { AppError } from '../utils/AppError.js';
import { paginar } from '../utils/paginacion.js';
import { generarPasswordTemporal } from '../utils/credenciales.js';
import * as repository from '../repositories/usuariosRepository.js';

const duplicado = (campo, message) => new AppError(409, 'DUPLICADO', message, [{ campo, mensaje: message }]);

function usuarioPublico(usuario) {
  const { rol, cliente, tecnico, ...data } = usuario;
  return { ...data, rol: rol.nombre, perfil: cliente ? 'cliente' : tecnico ? 'tecnico' : null };
}

const whereLista = (query) => ({
  ...(query.activo === undefined ? {} : { activo: query.activo === 'true' }),
  ...(query.rol ? { rol: { nombre: query.rol } } : {}),
  ...(query.q ? {
    OR: [
      { nombre: { contains: query.q, mode: 'insensitive' } },
      { email: { contains: query.q, mode: 'insensitive' } },
    ],
  } : {}),
});

export async function listar(query) {
  const page = paginar(query);
  const result = await repository.listarUsuarios(whereLista(query), page.skip, page.take);
  return { data: result.data.map(usuarioPublico), meta: { page: page.page, limit: page.limit, total: result.total } };
}

export async function obtener(id) {
  const usuario = await repository.buscarUsuario(id);
  if (!usuario) throw new AppError(404, 'NO_ENCONTRADO', 'Usuario no encontrado');
  return usuarioPublico(usuario);
}

export async function crear(values) {
  const email = values.email.toLowerCase();
  if (await repository.buscarUsuarioPorEmail(email)) throw duplicado('email', 'Ya existe un usuario con este correo');
  const rol = await repository.rolPorNombre(values.rol);
  if (!rol) throw new AppError(422, 'ROL_NO_CONFIGURADO', `No existe el rol ${values.rol}`);

  const passwordTemporal = generarPasswordTemporal();
  const usuario = await repository.crearUsuario({
    rolId: rol.id,
    nombre: values.nombre,
    email,
    telefono: values.telefono ?? null,
    passwordHash: await bcrypt.hash(passwordTemporal, 10),
    debeCambiarPassword: true,
    activo: true,
  });
  return { usuario: usuarioPublico(usuario), passwordTemporal };
}

export async function actualizar(id, values, actorId) {
  const actual = await repository.buscarUsuario(id);
  if (!actual) throw new AppError(404, 'NO_ENCONTRADO', 'Usuario no encontrado');

  const data = {};
  if (values.nombre !== undefined) data.nombre = values.nombre;
  if (values.telefono !== undefined) data.telefono = values.telefono;
  if (values.email !== undefined) {
    const email = values.email.toLowerCase();
    const existente = await repository.buscarUsuarioPorEmail(email);
    if (existente && existente.id !== id) throw duplicado('email', 'Ya existe un usuario con este correo');
    data.email = email;
  }
  if (values.rol && values.rol !== actual.rol.nombre) {
    if (actual.cliente || actual.tecnico) {
      throw new AppError(409, 'ROL_VINCULADO', 'No se puede cambiar el rol de una cuenta vinculada a un perfil');
    }
    if (['cliente', 'tecnico'].includes(values.rol)) {
      throw new AppError(422, 'PERFIL_REQUERIDO', 'Los roles de cliente y técnico se asignan al crear su perfil');
    }
    if (actual.rol.nombre === 'admin' && values.rol !== 'admin') await asegurarOtroAdministrador();
    const rol = await repository.rolPorNombre(values.rol);
    if (!rol) throw new AppError(422, 'ROL_NO_CONFIGURADO', `No existe el rol ${values.rol}`);
    data.rolId = rol.id;
  }
  if (values.activo !== undefined) {
    if (actorId === id && !values.activo) {
      throw new AppError(422, 'NO_PUEDE_DESACTIVARSE', 'No puedes desactivar tu propia cuenta');
    }
    if (!values.activo && actual.rol.nombre === 'admin') await asegurarOtroAdministrador();
    data.activo = values.activo;
    if (!values.activo) data.debeCambiarPassword = true;
  }

  if (Object.keys(data).length === 0) return usuarioPublico(actual);
  return usuarioPublico(await repository.actualizarUsuario(id, data));
}

export async function desactivar(id, actorId) {
  const actual = await repository.buscarUsuario(id);
  if (!actual) throw new AppError(404, 'NO_ENCONTRADO', 'Usuario no encontrado');
  if (actorId === id) throw new AppError(422, 'NO_PUEDE_DESACTIVARSE', 'No puedes desactivar tu propia cuenta');
  if (actual.activo && actual.rol.nombre === 'admin') await asegurarOtroAdministrador();
  await repository.actualizarUsuario(id, { activo: false, debeCambiarPassword: true });
}

export async function restablecerPasswordTemporal(id, actorId) {
  const actual = await repository.buscarUsuario(id);
  if (!actual) throw new AppError(404, 'NO_ENCONTRADO', 'Usuario no encontrado');
  if (actorId === id) {
    throw new AppError(422, 'NO_PUEDE_RESTABLECERSE', 'Usa Mi perfil o Recuperar contraseña para cambiar tu propia clave');
  }
  const passwordTemporal = generarPasswordTemporal();
  await repository.restablecerPasswordTemporal(id, await bcrypt.hash(passwordTemporal, 10));
  return { passwordTemporal };
}

async function asegurarOtroAdministrador() {
  // Evita dejar el sistema sin una cuenta activa con privilegios administrativos.
  if (await repository.contarAdministradoresActivos() <= 1) {
    throw new AppError(409, 'ULTIMO_ADMINISTRADOR', 'Debe existir al menos un administrador activo');
  }
}
