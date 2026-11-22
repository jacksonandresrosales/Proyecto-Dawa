import { Router } from 'express';
import * as controller from '../controllers/clientesController.js';
import { auth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/requireRole.js';
import { validate } from '../middlewares/validate.js';
import { idSchema, listSchema } from '../validators/common.js';
import { clienteCreateSchema, clienteUpdateSchema } from '../validators/personas.js';

export const clientesRouter = Router();
clientesRouter.use(auth);
clientesRouter.get('/', requireRole('admin', 'coordinador'), validate(listSchema, 'query'), controller.listar);
clientesRouter.post('/', requireRole('admin', 'coordinador'), validate(clienteCreateSchema), controller.crear);
clientesRouter.get('/:id/sedes', requireRole('admin', 'coordinador', 'cliente'), validate(idSchema, 'params'), controller.sedes);
clientesRouter.get('/:id', requireRole('admin', 'coordinador'), validate(idSchema, 'params'), controller.obtener);
clientesRouter.patch('/:id', requireRole('admin', 'coordinador'), validate(idSchema, 'params'), validate(clienteUpdateSchema), controller.actualizar);
clientesRouter.delete('/:id', requireRole('admin', 'coordinador'), validate(idSchema, 'params'), controller.eliminar);
