import * as service from '../services/catalogosService.js';

const responderLista = (recurso) => async (req, res) => { const result = await service.listar(recurso, req.query); res.json({ data: result.data, meta: result.meta }); };
const responderUno = (recurso) => async (req, res) => res.json({ data: await service.obtener(recurso, req.params.id) });
const crear = (recurso) => async (req, res) => res.status(201).json({ data: await service.crear(recurso, req.body) });
const actualizar = (recurso) => async (req, res) => res.json({ data: await service.actualizar(recurso, req.params.id, req.body) });
const eliminar = (recurso) => async (req, res) => { await service.eliminar(recurso, req.params.id); res.status(204).end(); };

export const especialidadesController = { listar: responderLista('especialidades'), obtener: responderUno('especialidades'), crear: crear('especialidades'), actualizar: actualizar('especialidades'), eliminar: eliminar('especialidades') };
export const categoriasController = { listar: responderLista('categorias'), obtener: responderUno('categorias'), crear: crear('categorias'), actualizar: actualizar('categorias'), eliminar: eliminar('categorias') };
export const prioridadesController = { listar: responderLista('prioridades'), obtener: responderUno('prioridades'), crear: crear('prioridades'), actualizar: actualizar('prioridades'), eliminar: eliminar('prioridades') };
