import * as service from '../services/tecnicosService.js';
export const listar = async (req, res) => { const result = await service.listar(req.query); res.json({ data: result.data, meta: result.meta }); };
export const obtener = async (req, res) => res.json({ data: await service.obtener(req.params.id) });
export const crear = async (req, res) => res.status(201).json({ data: await service.crear(req.body) });
export const actualizar = async (req, res) => res.json({ data: await service.actualizar(req.params.id, req.body) });
export const eliminar = async (req, res) => { await service.eliminar(req.params.id); res.status(204).end(); };
export const carga = async (req, res) => res.json({ data: await service.carga() });
