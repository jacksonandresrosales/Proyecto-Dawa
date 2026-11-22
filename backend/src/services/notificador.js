import { EventEmitter } from 'node:events';

// Avisa en vivo a las conexiones SSE abiertas. Las notificaciones ya quedaron guardadas en la
// misma transacción del cambio; esto solo empuja el aviso a quien esté conectado.
// shortcut: bus en memoria de un solo proceso; con varias instancias del backend, usar LISTEN/NOTIFY de PostgreSQL.
const bus = new EventEmitter();
bus.setMaxListeners(0); // una escucha por pestaña abierta

export function emitir(avisos, solicitudId) {
  for (const { usuarioId, tipo, mensaje } of avisos) bus.emit(`usuario:${usuarioId}`, { tipo, mensaje, solicitudId });
}

export function suscribir(usuarioId, alRecibir) {
  bus.on(`usuario:${usuarioId}`, alRecibir);
  return () => bus.off(`usuario:${usuarioId}`, alRecibir);
}
