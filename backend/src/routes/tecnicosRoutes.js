import { Router } from 'express';
import * as controller from '../controllers/tecnicosController.js';
import { auth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/requireRole.js';
import { validate } from '../middlewares/validate.js';
import { idSchema, listSchema } from '../validators/common.js';
import { tecnicoCreateSchema, tecnicoUpdateSchema } from '../validators/personas.js';

export const tecnicosRouter = Router();
tecnicosRouter.use(auth, requireRole('admin', 'coordinador'));
tecnicosRouter.get('/', validate(listSchema, 'query'), controller.listar);
tecnicosRouter.post('/', validate(tecnicoCreateSchema), controller.crear);
tecnicosRouter.get('/:id', validate(idSchema, 'params'), controller.obtener);
tecnicosRouter.patch('/:id', validate(idSchema, 'params'), validate(tecnicoUpdateSchema), controller.actualizar);
tecnicosRouter.delete('/:id', validate(idSchema, 'params'), controller.eliminar);
