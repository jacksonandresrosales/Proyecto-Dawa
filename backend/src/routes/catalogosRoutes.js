import { Router } from 'express';
import { auth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/requireRole.js';
import { validate } from '../middlewares/validate.js';
import { idSchema, listSchema } from '../validators/common.js';
import { categoriaCreateSchema, categoriaUpdateSchema, especialidadCreateSchema, especialidadUpdateSchema, prioridadCreateSchema, prioridadUpdateSchema } from '../validators/catalogos.js';
import { categoriasController, especialidadesController, prioridadesController } from '../controllers/catalogosController.js';

const gestion = ['admin', 'coordinador'];
const registrarCrud = (router, controller, createSchema, updateSchema, lecturaRoles = gestion) => {
  router.get('/', auth, requireRole(...lecturaRoles), validate(listSchema, 'query'), controller.listar);
  router.post('/', auth, requireRole(...gestion), validate(createSchema), controller.crear);
  router.get('/:id', auth, requireRole(...lecturaRoles), validate(idSchema, 'params'), controller.obtener);
  router.patch('/:id', auth, requireRole(...gestion), validate(idSchema, 'params'), validate(updateSchema), controller.actualizar);
  router.delete('/:id', auth, requireRole(...gestion), validate(idSchema, 'params'), controller.eliminar);
};
export const especialidadesRouter = Router(); registrarCrud(especialidadesRouter, especialidadesController, especialidadCreateSchema, especialidadUpdateSchema);
export const categoriasRouter = Router(); registrarCrud(categoriasRouter, categoriasController, categoriaCreateSchema, categoriaUpdateSchema, ['admin', 'coordinador', 'tecnico', 'cliente']);
export const prioridadesRouter = Router(); registrarCrud(prioridadesRouter, prioridadesController, prioridadCreateSchema, prioridadUpdateSchema, ['admin', 'coordinador', 'tecnico', 'cliente']);
