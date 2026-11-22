import * as service from '../services/solicitudesService.js';
import * as asignaciones from '../services/asignacionesService.js';

export const listar = async (req, res) => res.json(await service.listar(req.query, req.usuario));
export const obtener = async (req, res) => res.json({ data: await service.obtener(req.params.id, req.usuario) });
export const crear = async (req, res) => res.status(201).json({ data: await service.crear(req.body, req.usuario) });
export const cambiarEstado = async (req, res) => res.json({ data: await service.cambiarEstado(req.params.id, req.body, req.usuario) });
export const asignar = async (req, res) => res.status(201).json({ data: await asignaciones.asignar(req.params.id, req.body, req.usuario) });
export const historial = async (req, res) => res.json({ data: await service.historial(req.params.id, req.usuario) });
