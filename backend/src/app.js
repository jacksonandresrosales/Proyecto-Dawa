import express from 'express';
import { prisma } from './repositories/prisma.js';
import { AppError } from './utils/AppError.js';
import { errorHandler } from './middlewares/errorHandler.js';

// La app se exporta sin escuchar un puerto para poder probarla con Supertest.
export const app = express();

app.use(express.json());

app.get('/api/health', async (req, res) => {
  let db = true;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    db = false;
  }
  res.status(db ? 200 : 503).json({ data: { status: db ? 'ok' : 'sin_base_de_datos', db } });
});

app.use((req, res, next) => next(new AppError(404, 'NO_ENCONTRADO', 'Ruta no encontrada')));
app.use(errorHandler);
