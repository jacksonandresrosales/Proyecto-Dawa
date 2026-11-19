import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import * as controller from '../controllers/authController.js';
import { auth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { forgotPasswordSchema, initialSetupSchema, loginSchema, profileUpdateSchema, resetPasswordSchema } from '../validators/auth.js';

const rateLimitHandler = (_req, res) => res.status(429).json({
  error: { code: 'LIMITE_SOLICITUDES', message: 'Demasiados intentos. Espera antes de volver a intentarlo.' },
});
const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, handler: rateLimitHandler });
const forgotLimit = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false, handler: rateLimitHandler });
const setupLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false, handler: rateLimitHandler });

export const authRouter = Router();
authRouter.get('/setup-status', controller.setupStatus);
authRouter.post('/setup', setupLimit, validate(initialSetupSchema), controller.initialSetup);
authRouter.post('/login', loginLimit, validate(loginSchema), controller.login);
authRouter.post('/forgot', forgotLimit, validate(forgotPasswordSchema), controller.forgot);
authRouter.post('/reset', validate(resetPasswordSchema), controller.reset);
authRouter.post('/logout', auth, controller.logout);
authRouter.get('/me', auth, controller.me);
authRouter.patch('/me', auth, validate(profileUpdateSchema), controller.actualizarMe);
