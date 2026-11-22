import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { escucharNotificaciones, listarNotificaciones, marcarLeida, marcarTodas, type Notificacion } from '@/api/notificaciones';
import { fechaHora } from '@/lib/solicitudes';

export const EVENTO_NOTIFICACION = 'servigest:notificacion';

export default function Campana() {
  const navigate = useNavigate();
  const panel = useRef<HTMLDivElement>(null);
  const [abierta, setAbierta] = useState(false);
  const [items, setItems] = useState<Notificacion[] | null>(null);
  const [noLeidas, setNoLeidas] = useState(0);

  const cargar = useCallback(async () => {
    try {
      const respuesta = await listarNotificaciones();
      setItems(respuesta.data);
      setNoLeidas(respuesta.meta.noLeidas);
    } catch { /* la campana no bloquea la pantalla; se reintenta con el siguiente aviso */ }
  }, []);

  // Conexión SSE: cada aviso recarga la lista y avisa a la pantalla abierta (por ejemplo, el detalle).
  useEffect(() => {
    const corte = new AbortController();
    let reintento: ReturnType<typeof setTimeout>;
    const conectar = () => {
      void cargar(); // recupera lo que llegó mientras no había conexión
      escucharNotificaciones((aviso) => {
        void cargar();
        window.dispatchEvent(new CustomEvent(EVENTO_NOTIFICACION, { detail: aviso }));
      }, corte.signal)
        .catch(() => undefined)
        .finally(() => { if (!corte.signal.aborted) reintento = setTimeout(conectar, 5000); });
    };
    queueMicrotask(conectar);
    return () => { corte.abort(); clearTimeout(reintento); };
  }, [cargar]);

  useEffect(() => {
    if (!abierta) return;
    const fuera = (e: MouseEvent) => { if (!panel.current?.contains(e.target as Node)) setAbierta(false); };
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierta(false); };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', escape); };
  }, [abierta]);

  async function abrir(n: Notificacion) {
    setAbierta(false);
    if (!n.leida) await marcarLeida(n.id).catch(() => undefined);
    void cargar();
    if (n.solicitudId) navigate(`/solicitudes/${n.solicitudId}`);
  }

  return (
    <div ref={panel} className="relative">
      <button
        type="button"
        className="relative grid size-9 place-items-center rounded-md hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        aria-label={noLeidas ? `Notificaciones, ${noLeidas} sin leer` : 'Notificaciones'}
        aria-expanded={abierta}
        onClick={() => setAbierta((v) => !v)}
      >
        <Bell className="size-5" strokeWidth={1.75} aria-hidden="true" />
        {noLeidas > 0 && (
          <span aria-hidden="true" className="absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>
      {abierta && (
        <div className="absolute right-0 top-full z-20 mt-2 w-80 rounded-xl border bg-card shadow-lg" role="dialog" aria-label="Notificaciones">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="text-sm font-semibold">Notificaciones</span>
            {noLeidas > 0 && (
              <button type="button" className="text-xs text-primary hover:underline" onClick={() => { void marcarTodas().then(cargar); }}>
                Marcar todas como leídas
              </button>
            )}
          </div>
          {!items ? <p role="status" className="px-4 py-6 text-sm text-muted-foreground">Cargando…</p>
            : !items.length ? <p className="px-4 py-6 text-sm text-muted-foreground">No tienes notificaciones. Aquí verás los cambios de tus solicitudes.</p>
              : (
                <ul className="max-h-96 overflow-y-auto">
                  {items.map((n) => (
                    <li key={n.id}>
                      <button type="button" onClick={() => { void abrir(n); }} className="flex w-full gap-3 px-4 py-3 text-left hover:bg-accent">
                        <span aria-hidden="true" className={`mt-1.5 size-2 shrink-0 rounded-full ${n.leida ? 'bg-transparent' : 'bg-primary'}`} />
                        <span>
                          <span className={`block text-sm ${n.leida ? 'text-muted-foreground' : 'font-medium'}`}>{n.mensaje}</span>
                          <span className="block font-mono text-xs text-muted-foreground">{fechaHora(n.createdAt)}{n.leida ? '' : ' · sin leer'}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
        </div>
      )}
    </div>
  );
}
