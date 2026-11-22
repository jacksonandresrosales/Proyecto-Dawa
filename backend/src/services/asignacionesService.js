import { AppError } from '../utils/AppError.js';
import * as repository from '../repositories/solicitudesRepository.js';
import { ESTADOS_ACTIVOS } from './transiciones.js';
import { presentar } from './solicitudesService.js';
import { emitir } from './notificador.js';

const rechazo = (code, mensaje) => new AppError(422, code, mensaje);

// Regla 5, en el orden de docs/tecnico/03-estados-y-reglas.md ("Asignación").
export async function asignar(id, values, usuario) {
  const solicitud = await repository.buscarSolicitud({ id });
  if (!solicitud) throw new AppError(404, 'NO_ENCONTRADO', 'Solicitud no encontrada');
  const estado = solicitud.estado.codigo;
  const reasignacion = ESTADOS_ACTIVOS.includes(estado);
  if (estado !== 'aprobada' && !reasignacion) throw new AppError(409, 'ESTADO_NO_ASIGNABLE', `No se puede asignar una solicitud en estado ${estado}`);

  const tecnico = await repository.buscarTecnico(values.tecnicoId);
  if (!tecnico) throw new AppError(404, 'NO_ENCONTRADO', 'Técnico no encontrado');
  if (!tecnico.usuario.activo) throw rechazo('TECNICO_NO_DISPONIBLE', 'La cuenta del técnico no está activa');
  if (!tecnico.especialidades.some((e) => e.especialidadId === solicitud.categoria.especialidadId)) {
    throw rechazo('TECNICO_SIN_ESPECIALIDAD', 'El técnico no tiene la especialidad que requiere la categoría');
  }
  if (!tecnico.disponible) throw rechazo('TECNICO_NO_DISPONIBLE', 'El técnico no está disponible');
  // shortcut: el conteo se lee antes de la transacción; dos asignaciones simultáneas al mismo
  // técnico podrían superar carga_max por uno. Bloquear la fila del técnico si llega a importar.
  if (await repository.contarActivas(tecnico.id, ESTADOS_ACTIVOS) >= tecnico.cargaMax) {
    throw rechazo('TECNICO_CARGA_MAXIMA', 'El técnico alcanzó su carga máxima de solicitudes activas');
  }
  if (reasignacion && tecnico.id === solicitud.tecnicoActualId) throw rechazo('MISMO_TECNICO', 'La solicitud ya está asignada a este técnico');
  if (reasignacion && !values.justificacion) throw rechazo('JUSTIFICACION_REQUERIDA', 'La reasignación requiere una justificación');

  const avisos = [
    { usuarioId: tecnico.usuarioId, tipo: 'asignacion', mensaje: `Se te asignó la solicitud ${solicitud.codigo}` },
    { usuarioId: solicitud.cliente.usuarioId, tipo: 'asignacion', mensaje: `Tu solicitud ${solicitud.codigo} fue asignada a un técnico` },
  ];
  if (reasignacion) avisos.push({ usuarioId: solicitud.tecnicoActual.usuarioId, tipo: 'asignacion', mensaje: `Se te retiró la solicitud ${solicitud.codigo}` });

  const actualizada = await repository.asignar({
    id,
    version: solicitud.version,
    tecnicoId: tecnico.id,
    usuarioId: usuario.id,
    justificacion: values.justificacion ?? null,
    cambiaEstado: !reasignacion,
    comentario: `Asignada a ${tecnico.usuario.nombre}`,
    avisos,
  });
  if (!actualizada) throw new AppError(409, 'CONFLICTO_VERSION', 'Otra persona modificó la solicitud; recárgala e inténtalo de nuevo');
  emitir(avisos, id);
  return presentar(actualizada);
}
