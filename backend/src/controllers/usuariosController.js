import * as service from '../services/usuariosService.js';

export const listar = async (req, res) => {
  const result = await service.listar(req.query);
  res.json({ data: result.data, meta: result.meta });
};
export const obtener = async (req, res) => res.json({ data: await service.obtener(req.params.id) });
export const crear = async (req, res) => res.status(201).json({ data: await service.crear(req.body) });
export const actualizar = async (req, res) => res.json({ data: await service.actualizar(req.params.id, req.body, req.usuario.id) });
export const eliminar = async (req, res) => {
  await service.desactivar(req.params.id, req.usuario.id);
  res.status(204).end();
};
export const restablecerPassword = async (req, res) => res.json({
  data: await service.restablecerPasswordTemporal(req.params.id, req.usuario.id),
});
