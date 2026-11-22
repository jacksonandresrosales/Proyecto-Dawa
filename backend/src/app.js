import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { prisma } from './repositories/prisma.js';
import { AppError } from './utils/AppError.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { authRouter } from './routes/authRoutes.js';
import { clientesRouter } from './routes/clientesRoutes.js';
import { tecnicosRouter } from './routes/tecnicosRoutes.js';
import { categoriasRouter, especialidadesRouter, prioridadesRouter } from './routes/catalogosRoutes.js';
import { usuariosRouter } from './routes/usuariosRoutes.js';
import { solicitudesRouter } from './routes/solicitudesRoutes.js';
import { notificacionesRouter } from './routes/notificacionesRoutes.js';

// La app se exporta sin escuchar un puerto para poder probarla con Supertest.
export const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', async (req, res) => {
  let db = true;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    db = false;
  }
  res.status(db ? 200 : 503).json({ data: { status: db ? 'ok' : 'sin_base_de_datos', db } });
});

app.use('/api/auth', authRouter);
app.use('/api/usuarios', usuariosRouter);
app.use('/api/clientes', clientesRouter);
app.use('/api/tecnicos', tecnicosRouter);
app.use('/api/especialidades', especialidadesRouter);
app.use('/api/categorias', categoriasRouter);
app.use('/api/prioridades', prioridadesRouter);
app.use('/api/solicitudes', solicitudesRouter);
app.use('/api/notificaciones', notificacionesRouter);

app.use((req, res, next) => next(new AppError(404, 'NO_ENCONTRADO', 'Ruta no encontrada')));
app.use(errorHandler);
