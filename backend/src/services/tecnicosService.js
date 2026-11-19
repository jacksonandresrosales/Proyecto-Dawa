import bcrypt from 'bcryptjs';
import { AppError } from '../utils/AppError.js';
import { paginar } from '../utils/paginacion.js';
import { generarPasswordTemporal } from '../utils/credenciales.js';
import * as repository from '../repositories/tecnicosRepository.js';
import { buscarUsuarioPorEmail, rolPorNombre } from '../repositories/clientesRepository.js';

const duplicado = (campo, mensaje) => new AppError(409, 'DUPLICADO', mensaje, [{ campo, mensaje }]);
const whereLista = (query) => ({ ...(query.activo === undefined ? {} : { usuario: { activo: query.activo === 'true' } }), ...(query.q ? { OR: [{ usuario: { nombre: { contains: query.q, mode: 'insensitive' } } }, { usuario: { email: { contains: query.q, mode: 'insensitive' } } }] } : {}) });
async function validarEspecialidades(ids) {
  if (new Set(ids).size !== ids.length) throw new AppError(422, 'ESPECIALIDADES_DUPLICADAS', 'No repitas especialidades');
  const existentes = await repository.especialidadesActivas(ids);
  if (existentes.length !== ids.length) throw new AppError(422, 'ESPECIALIDAD_INVALIDA', 'Una o más especialidades no existen o están inactivas');
}
export async function listar(query) { const p = paginar(query); const result = await repository.listarTecnicos(whereLista(query), p.skip, p.take); return { ...result, meta: { page: p.page, limit: p.limit, total: result.total } }; }
export async function obtener(id) { const tecnico = await repository.buscarTecnico(id); if (!tecnico) throw new AppError(404, 'NO_ENCONTRADO', 'Técnico no encontrado'); return tecnico; }
export async function crear(values) {
  const email = values.email.toLowerCase();
  if (await buscarUsuarioPorEmail(email)) throw duplicado('email', 'Ya existe un usuario con este correo');
  await validarEspecialidades(values.especialidadIds);
  const rol = await rolPorNombre('tecnico');
  if (!rol) throw new AppError(422, 'ROL_NO_CONFIGURADO', 'No existe el rol técnico');
  const passwordTemporal = generarPasswordTemporal();
  const tecnico = await repository.crearTecnico({ usuario: { rolId: rol.id, nombre: values.nombre, email, passwordHash: await bcrypt.hash(passwordTemporal, 10), telefono: values.telefono ?? null, debeCambiarPassword: true }, disponible: values.disponible ?? true, cargaMax: values.cargaMax ?? 5, especialidadIds: values.especialidadIds });
  return { ...tecnico, passwordTemporal };
}
export async function actualizar(id, values) {
  const actual = await obtener(id);
  if (values.email && values.email.toLowerCase() !== actual.usuario.email && await buscarUsuarioPorEmail(values.email.toLowerCase())) throw duplicado('email', 'Ya existe un usuario con este correo');
  if (values.especialidadIds) await validarEspecialidades(values.especialidadIds);
  const usuarioData = {};
  for (const key of ['nombre', 'telefono', 'activo']) if (values[key] !== undefined) usuarioData[key] = values[key];
  if (values.email !== undefined) usuarioData.email = values.email.toLowerCase();
  const tecnicoData = {};
  for (const key of ['disponible', 'cargaMax']) if (values[key] !== undefined) tecnicoData[key] = values[key];
  return repository.actualizarTecnico(id, { usuario: Object.keys(usuarioData).length ? { id: actual.usuarioId, data: usuarioData } : null, tecnico: tecnicoData, especialidadIds: values.especialidadIds });
}
export async function eliminar(id) { await obtener(id); if (await repository.contarEspecialidades(id)) throw new AppError(409, 'EN_USO', 'El técnico tiene especialidades y solo puede desactivarse'); return repository.eliminarTecnico(id); }
