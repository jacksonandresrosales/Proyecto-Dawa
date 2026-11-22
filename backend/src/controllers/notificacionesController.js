import * as service from '../services/notificacionesService.js';
import { suscribir } from '../services/notificador.js';

export const listar = async (req, res) => res.json(await service.listar(req.query, req.usuario));
export const marcarLeida = async (req, res) => { await service.marcarLeida(req.params.id, req.usuario); res.status(204).end(); };
export const marcarTodas = async (req, res) => res.json({ data: await service.marcarTodas(req.usuario) });

// Server-Sent Events: la conexión queda abierta y cada aviso nuevo se envía como evento `notificacion`.
export function stream(req, res) {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.flushHeaders();
  res.write(': conectado\n\n');
  const cancelar = suscribir(req.usuario.id, (aviso) => res.write(`event: notificacion\ndata: ${JSON.stringify(aviso)}\n\n`));
  const latido = setInterval(() => res.write(': latido\n\n'), 25_000); // evita que proxies corten la conexión inactiva
  req.on('close', () => { clearInterval(latido); cancelar(); });
}
