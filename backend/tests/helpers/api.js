import request from 'supertest';
import { app } from '../../src/app.js';

// Cliente de la API para pruebas: api().get('/api/...')
export const api = () => request(app);
