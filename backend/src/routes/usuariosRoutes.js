import { Router } from 'express';
import * as controller from '../controllers/usuariosController.js';
import { auth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/requireRole.js';
import { validate } from '../middlewares/validate.js';
import { idSchema } from '../validators/common.js';
import { usuarioCreateSchema, usuarioListSchema, usuarioUpdateSchema } from '../validators/usuarios.js';

export const usuariosRouter = Router();
usuariosRouter.use(auth, requireRole('admin'));
usuariosRouter.get('/', validate(usuarioListSchema, 'query'), controller.listar);
usuariosRouter.post('/', validate(usuarioCreateSchema), controller.crear);
usuariosRouter.get('/:id', validate(idSchema, 'params'), controller.obtener);
usuariosRouter.patch('/:id', validate(idSchema, 'params'), validate(usuarioUpdateSchema), controller.actualizar);
usuariosRouter.delete('/:id', validate(idSchema, 'params'), controller.eliminar);
usuariosRouter.post('/:id/restablecer-password', validate(idSchema, 'params'), controller.restablecerPassword);
