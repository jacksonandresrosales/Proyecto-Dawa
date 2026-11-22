import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ApiRequestError } from '@/api/admin';
import { listarSolicitudes, type EstadoCodigo, type Solicitud } from '@/api/solicitudes';
import { useAuth } from '@/auth/AuthContext';
import Pildora from '@/components/Pildora';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ESTADOS, PLAZOS, fechaHora, tonoPrioridad } from '@/lib/solicitudes';

const LIMITE = 10;
const campo = 'h-10 rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring';
const TITULOS = { cliente: 'Mis solicitudes', tecnico: 'Asignadas a mí', coordinador: 'Solicitudes', admin: 'Solicitudes' };
const vacio = { q: '', estado: '', desde: '', hasta: '' };

export default function SolicitudesPage() {
  const { user } = useAuth();
  const rol = user?.rol ?? 'cliente';
  const [borrador, setBorrador] = useState(vacio);
  const [filtros, setFiltros] = useState(vacio);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Solicitud[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let activo = true;
    const params = new URLSearchParams({ page: String(page), limit: String(LIMITE) });
    for (const [clave, valor] of Object.entries(filtros)) if (valor) params.set(clave, valor);
    queueMicrotask(() => {
      if (!activo) return;
      setLoading(true);
      listarSolicitudes(params)
        .then((r) => { if (activo) { setItems(r.data); setTotal(r.meta.total); setError(''); } })
        .catch((e: unknown) => { if (activo) setError(e instanceof ApiRequestError ? e.message : 'No se pudieron cargar las solicitudes.'); })
        .finally(() => { if (activo) setLoading(false); });
    });
    return () => { activo = false; };
  }, [filtros, page, intento]);

  function aplicar(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setFiltros(borrador);
  }
  const hayFiltros = Object.values(filtros).some(Boolean);

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Solicitudes</p>
          <h1 className="mt-1 text-xl font-medium">{TITULOS[rol]}</h1>
        </div>
        {(rol === 'cliente' || rol === 'coordinador') && <Button asChild><Link to="/solicitudes/nueva">Nueva solicitud</Link></Button>}
      </header>

      <form onSubmit={aplicar} className="flex flex-wrap items-end gap-3" aria-label="Filtros de solicitudes">
        <label className="text-sm font-medium">Buscar
          <input className={`${campo} mt-1 block w-60`} placeholder="Código, equipo o descripción" value={borrador.q} onChange={(e) => setBorrador({ ...borrador, q: e.target.value })} />
        </label>
        <label className="text-sm font-medium">Estado
          <select className={`${campo} mt-1 block`} value={borrador.estado} onChange={(e) => setBorrador({ ...borrador, estado: e.target.value })}>
            <option value="">Todos</option>
            {(Object.keys(ESTADOS) as EstadoCodigo[]).map((codigo) => <option key={codigo} value={codigo}>{ESTADOS[codigo].nombre}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">Desde
          <input type="date" className={`${campo} mt-1 block`} value={borrador.desde} max={borrador.hasta || undefined} onChange={(e) => setBorrador({ ...borrador, desde: e.target.value })} />
        </label>
        <label className="text-sm font-medium">Hasta
          <input type="date" className={`${campo} mt-1 block`} value={borrador.hasta} min={borrador.desde || undefined} onChange={(e) => setBorrador({ ...borrador, hasta: e.target.value })} />
        </label>
        <Button type="submit" variant="outline">Filtrar</Button>
        {hayFiltros && <Button type="button" variant="ghost" onClick={() => { setBorrador(vacio); setFiltros(vacio); setPage(1); }}>Limpiar</Button>}
      </form>

      <Card>
        <CardContent className="p-0">
          {error ? (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-3 p-6 text-sm">
              <span>{error}</span>
              <Button type="button" variant="outline" onClick={() => setIntento((n) => n + 1)}>Reintentar</Button>
            </div>
          ) : loading && !items.length ? (
            <p role="status" className="p-6 text-sm text-muted-foreground">Cargando solicitudes…</p>
          ) : !items.length ? (
            <div className="p-6 text-sm">
              <p className="font-medium">{hayFiltros ? 'Ninguna solicitud coincide con los filtros.' : 'Todavía no hay solicitudes.'}</p>
              <p className="mt-1 text-muted-foreground">
                {hayFiltros ? 'Prueba con otros filtros o límpialos.' : rol === 'tecnico' ? 'Aquí verás las solicitudes que te asignen.' : 'Cuando se registre una, aparecerá aquí.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[52rem] text-left text-sm" aria-busy={loading}>
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-3">Código</th>
                    <th className="px-3 py-3">Equipo</th>
                    {rol !== 'cliente' && <th className="px-3 py-3">Cliente</th>}
                    <th className="px-3 py-3">Estado</th>
                    <th className="px-3 py-3">Prioridad</th>
                    <th className="px-3 py-3">Plazo</th>
                    {rol !== 'tecnico' && <th className="px-3 py-3">Técnico</th>}
                  </tr>
                </thead>
                <tbody>
                  {items.map((s) => (
                    <tr key={s.id} className="border-t hover:bg-accent">
                      <td className="whitespace-nowrap px-3 py-3 font-mono"><Link className="text-primary hover:underline" to={`/solicitudes/${s.id}`}>{s.codigo}</Link></td>
                      <td className="px-3 py-3"><span className="font-medium">{s.equipo}</span><div className="text-muted-foreground">{s.categoria.nombre} · {s.sede.nombre}</div></td>
                      {rol !== 'cliente' && <td className="px-3 py-3">{s.cliente.razonSocial}</td>}
                      <td className="px-3 py-3"><Pildora tono={ESTADOS[s.estado].tono}>{ESTADOS[s.estado].nombre}</Pildora></td>
                      <td className="px-3 py-3"><Pildora tono={tonoPrioridad(s.prioridad)}>{s.prioridad}</Pildora></td>
                      <td className="px-3 py-3">
                        {s.estadoPlazo && <Pildora tono={PLAZOS[s.estadoPlazo].tono}>{PLAZOS[s.estadoPlazo].nombre}</Pildora>}
                        <div className="mt-1 font-mono text-xs text-muted-foreground">{fechaHora(s.fechaLimite)}</div>
                      </td>
                      {rol !== 'tecnico' && <td className="px-3 py-3">{s.tecnico?.nombre ?? <span className="text-muted-foreground">Sin asignar</span>}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {total > LIMITE && (
        <nav className="flex items-center gap-3" aria-label="Paginación">
          <Button type="button" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
          <span className="text-sm">Página {page} de {Math.ceil(total / LIMITE)} · {total} solicitudes</span>
          <Button type="button" variant="outline" disabled={page * LIMITE >= total || loading} onClick={() => setPage((p) => p + 1)}>Siguiente</Button>
        </nav>
      )}
    </>
  );
}
