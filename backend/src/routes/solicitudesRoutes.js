import { Router } from 'express';
import * as controller from '../controllers/solicitudesController.js';
import { auth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/requireRole.js';
import { validate } from '../middlewares/validate.js';
import { idSchema } from '../validators/common.js';
import { asignacionSchema, cambioEstadoSchema, solicitudCreateSchema, solicitudListSchema } from '../validators/solicitudes.js';

// Los cuatro roles leen; el servicio limita qué ve cada uno (regla 3) y quién cambia cada estado.
export const solicitudesRouter = Router();
solicitudesRouter.use(auth);
solicitudesRouter.get('/', validate(solicitudListSchema, 'query'), controller.listar);
solicitudesRouter.post('/', requireRole('coordinador', 'cliente'), validate(solicitudCreateSchema), controller.crear);
solicitudesRouter.get('/:id', validate(idSchema, 'params'), controller.obtener);
solicitudesRouter.patch('/:id/estado', validate(idSchema, 'params'), validate(cambioEstadoSchema), controller.cambiarEstado);
solicitudesRouter.post('/:id/asignaciones', requireRole('coordinador'), validate(idSchema, 'params'), validate(asignacionSchema), controller.asignar);
solicitudesRouter.get('/:id/historial', validate(idSchema, 'params'), controller.historial);
