import * as service from '../services/authService.js';

export const login = async (req, res) => res.json({ data: await service.iniciarSesion(req.body) });
export const setupStatus = async (req, res) => res.json({ data: await service.estadoConfiguracionInicial() });
export const initialSetup = async (req, res) => res.status(201).json({
  data: await service.crearAdministradorInicial(req.body),
});
export const logout = (req, res) => res.status(204).end();
export const me = async (req, res) => res.json({ data: await service.obtenerPerfil(req.usuario.id) });
export const actualizarMe = async (req, res) => res.json({ data: await service.actualizarPerfil(req.usuario.id, req.body) });
export const forgot = async (req, res) => res.json({ data: { message: await service.solicitarRestablecimiento(req.body.email) } });
export const reset = async (req, res) => res.json({ data: await service.restablecerPassword(req.body.token, req.body.newPassword) });
