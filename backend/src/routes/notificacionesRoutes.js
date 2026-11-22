import { Router } from 'express';
import { z } from 'zod';
import * as controller from '../controllers/notificacionesController.js';
import { auth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { idSchema, listSchema } from '../validators/common.js';

const listaSchema = listSchema.pick({ page: true, limit: true }).extend({ leida: z.enum(['true', 'false']).optional() });

export const notificacionesRouter = Router();
notificacionesRouter.use(auth);
notificacionesRouter.get('/', validate(listaSchema, 'query'), controller.listar);
notificacionesRouter.get('/stream', controller.stream);
notificacionesRouter.patch('/leidas', controller.marcarTodas);
notificacionesRouter.patch('/:id/leida', validate(idSchema, 'params'), controller.marcarLeida);
