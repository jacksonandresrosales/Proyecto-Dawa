import { Router } from 'express';
import * as controller from '../controllers/dashboardController.js';
import { auth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/requireRole.js';
import { validate } from '../middlewares/validate.js';
import { solicitudListSchema } from '../validators/solicitudes.js';

const filtrosSchema = solicitudListSchema.pick({ desde: true, hasta: true, categoria: true, tecnico: true, cliente: true });

export const dashboardRouter = Router();
dashboardRouter.use(auth, requireRole('admin', 'coordinador'));
dashboardRouter.get('/indicadores', validate(filtrosSchema, 'query'), controller.indicadores);
