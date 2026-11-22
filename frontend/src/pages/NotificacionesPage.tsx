import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiRequestError } from '@/api/admin';
import { listarNotificaciones, marcarLeida, marcarTodas, type Notificacion } from '@/api/notificaciones';
import { EVENTO_NOTIFICACION } from '@/components/Campana';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { fechaHora } from '@/lib/solicitudes';

const LIMITE = 20;

export default function NotificacionesPage() {
  const navigate = useNavigate();
  const [soloNoLeidas, setSoloNoLeidas] = useState(false);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Notificacion[] | null>(null);
  const [total, setTotal] = useState(0);
  const [noLeidas, setNoLeidas] = useState(0);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    try {
      const r = await listarNotificaciones(`page=${page}&limit=${LIMITE}${soloNoLeidas ? '&leida=false' : ''}`);
      setItems(r.data);
      setTotal(r.meta.total);
      setNoLeidas(r.meta.noLeidas);
      setError('');
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : 'No se pudieron cargar las notificaciones.');
    }
  }, [page, soloNoLeidas]);

  useEffect(() => { queueMicrotask(() => { void cargar(); }); }, [cargar]);
  // Llegan avisos nuevos por SSE mientras la página está abierta.
  useEffect(() => {
    const alAviso = () => { void cargar(); };
    window.addEventListener(EVENTO_NOTIFICACION, alAviso);
    return () => window.removeEventListener(EVENTO_NOTIFICACION, alAviso);
  }, [cargar]);

  async function abrir(n: Notificacion) {
    if (!n.leida) await marcarLeida(n.id).catch(() => undefined);
    if (n.solicitudId) navigate(`/solicitudes/${n.solicitudId}`);
    else void cargar();
  }

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Notificaciones</p>
          <h1 className="mt-1 text-xl font-medium">Tus avisos</h1>
          <p className="mt-1 text-sm text-muted-foreground">{noLeidas ? `${noLeidas} sin leer` : 'Estás al día'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant={soloNoLeidas ? 'default' : 'outline'} aria-pressed={soloNoLeidas} onClick={() => { setSoloNoLeidas((v) => !v); setPage(1); }}>Solo no leídas</Button>
          {noLeidas > 0 && <Button type="button" variant="outline" onClick={() => { void marcarTodas().then(cargar); }}>Marcar todas como leídas</Button>}
        </div>
      </header>

      <Card>
        <CardContent className="p-0">
          {error ? <p role="alert" className="p-6 text-sm">{error}</p>
            : !items ? <p role="status" className="p-6 text-sm text-muted-foreground">Cargando…</p>
              : !items.length ? (
                <p className="p-6 text-sm text-muted-foreground">{soloNoLeidas ? 'No tienes avisos sin leer.' : 'Aún no tienes notificaciones. Aquí verás los cambios de tus solicitudes.'}</p>
              ) : (
                <ul className="divide-y">
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
        </CardContent>
      </Card>

      {total > LIMITE && (
        <nav className="flex items-center gap-3" aria-label="Paginación">
          <Button type="button" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
          <span className="text-sm">Página {page} de {Math.ceil(total / LIMITE)}</span>
          <Button type="button" variant="outline" disabled={page * LIMITE >= total} onClick={() => setPage((p) => p + 1)}>Siguiente</Button>
        </nav>
      )}
    </>
  );
}
