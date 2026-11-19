import bcrypt from 'bcryptjs';
import { AppError } from '../utils/AppError.js';
import { paginar } from '../utils/paginacion.js';
import { generarPasswordTemporal } from '../utils/credenciales.js';
import * as repository from '../repositories/clientesRepository.js';

const duplicado = (campo, mensaje) => new AppError(409, 'DUPLICADO', mensaje, [{ campo, mensaje }]);
const whereLista = (query) => ({ ...(query.activo === undefined ? {} : { activo: query.activo === 'true' }), ...(query.q ? { OR: [{ razonSocial: { contains: query.q, mode: 'insensitive' } }, { ruc: { contains: query.q } }, { usuario: { email: { contains: query.q, mode: 'insensitive' } } }] } : {}) });

export async function listar(query) {
  const pagination = paginar(query);
  const result = await repository.listarClientes(whereLista(query), pagination.skip, pagination.take);
  return { ...result, meta: { page: pagination.page, limit: pagination.limit, total: result.total } };
}
export async function obtener(id) {
  const cliente = await repository.buscarCliente(id);
  if (!cliente) throw new AppError(404, 'NO_ENCONTRADO', 'Cliente no encontrado');
  return cliente;
}
export async function crear(values) {
  const email = values.email.toLowerCase();
  if (await repository.buscarUsuarioPorEmail(email)) throw duplicado('email', 'Ya existe un usuario con este correo');
  if (await repository.buscarClientePorRuc(values.ruc)) throw duplicado('ruc', 'Ya existe un cliente con este RUC');
  const rol = await repository.rolPorNombre('cliente');
  if (!rol) throw new AppError(422, 'ROL_NO_CONFIGURADO', 'No existe el rol cliente');
  const passwordTemporal = generarPasswordTemporal();
  const cliente = await repository.crearCliente({ usuario: { rolId: rol.id, nombre: values.nombre, email, passwordHash: await bcrypt.hash(passwordTemporal, 10), telefono: values.telefono ?? null, debeCambiarPassword: true }, razonSocial: values.razonSocial, ruc: values.ruc, activo: true, sedes: values.sedes });
  return { ...cliente, passwordTemporal };
}
export async function actualizar(id, values) {
  const actual = await obtener(id);
  if (values.email && values.email.toLowerCase() !== actual.usuario.email) {
    if (await repository.buscarUsuarioPorEmail(values.email.toLowerCase())) throw duplicado('email', 'Ya existe un usuario con este correo');
  }
  if (values.ruc && values.ruc !== actual.ruc) {
    if (await repository.buscarClientePorRuc(values.ruc)) throw duplicado('ruc', 'Ya existe un cliente con este RUC');
  }
  const usuarioData = {};
  for (const key of ['nombre', 'telefono']) if (values[key] !== undefined) usuarioData[key] = values[key];
  if (values.email !== undefined) usuarioData.email = values.email.toLowerCase();
  const clienteData = {};
  for (const [input, field] of [['razonSocial', 'razonSocial'], ['ruc', 'ruc'], ['activo', 'activo']]) if (values[input] !== undefined) clienteData[field] = values[input];
  if (values.activo !== undefined) usuarioData.activo = values.activo;
  return repository.actualizarCliente(id, { usuario: Object.keys(usuarioData).length ? { id: actual.usuarioId, data: usuarioData } : null, cliente: clienteData, sedes: values.sedes });
}
export async function eliminar(id) {
  await obtener(id);
  if (await repository.contarSedes(id)) throw new AppError(409, 'EN_USO', 'El cliente tiene sedes y solo puede desactivarse');
  return repository.eliminarCliente(id);
}
