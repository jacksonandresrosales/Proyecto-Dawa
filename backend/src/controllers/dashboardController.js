import * as service from '../services/dashboardService.js';

export const indicadores = async (req, res) => res.json({ data: await service.indicadores(req.query) });
