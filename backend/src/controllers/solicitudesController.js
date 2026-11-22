import * as service from '../services/solicitudesService.js';
import * as asignaciones from '../services/asignacionesService.js';
import * as adjuntos from '../services/adjuntosService.js';

export const listar = async (req, res) => res.json(await service.listar(req.query, req.usuario));
export const obtener = async (req, res) => res.json({ data: await service.obtener(req.params.id, req.usuario) });
export const crear = async (req, res) => res.status(201).json({ data: await service.crear(req.body, req.usuario) });
export const cambiarEstado = async (req, res) => res.json({ data: await service.cambiarEstado(req.params.id, req.body, req.usuario) });
export const asignar = async (req, res) => res.status(201).json({ data: await asignaciones.asignar(req.params.id, req.body, req.usuario) });
export const historial = async (req, res) => res.json({ data: await service.historial(req.params.id, req.usuario) });

export const listarAdjuntos = async (req, res) => res.json({ data: await adjuntos.listar(req.params.id, req.usuario) });
export const subirAdjunto = async (req, res) => res.status(201).json({
  data: await adjuntos.subir(req.params.id, { nombre: req.query.nombre.trim(), mime: (req.get('content-type') ?? '').split(';')[0].trim(), contenido: req.body }, req.usuario),
});
export async function descargarAdjunto(req, res) {
  const archivo = await adjuntos.obtenerArchivo(req.params.id, Number(req.params.adjuntoId), req.usuario);
  res.type(archivo.mime);
  res.attachment(archivo.nombre); // descarga, nunca se muestra dentro de la app
  res.sendFile(archivo.ruta);
}
