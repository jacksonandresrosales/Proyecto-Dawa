import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiRequestError } from '@/api/admin';
import { obtenerCarga, type CargaTecnico } from '@/api/solicitudes';
import Pildora from '@/components/Pildora';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ESTADOS, venceEn, type Tono } from '@/lib/solicitudes';

const tonoCarga = (activas: number, max: number): Tono => (activas >= max ? 'danger' : activas >= max * 0.8 ? 'warning' : 'info');

export default function CargaTecnicosPage() {
  const [tecnicos, setTecnicos] = useState<CargaTecnico[] | null>(null);
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let activo = true;
    obtenerCarga()
      .then((t) => { if (activo) { setTecnicos(t); setError(''); } })
      .catch((e: unknown) => { if (activo) setError(e instanceof ApiRequestError ? e.message : 'No se pudo cargar la carga de los técnicos.'); });
    return () => { activo = false; };
  }, [intento]);

  return (
    <>
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Equipo</p>
        <h1 className="mt-1 text-xl font-medium">Carga de técnicos</h1>
        <p className="mt-1 text-sm text-muted-foreground">Solicitudes asignadas, en proceso o esperando al cliente, frente a la carga máxima de cada técnico.</p>
      </header>
      {error ? (
        <Card><CardContent role="alert" className="flex flex-wrap items-center justify-between gap-3 p-6 text-sm">
          <span>{error}</span><Button type="button" variant="outline" onClick={() => setIntento((n) => n + 1)}>Reintentar</Button>
        </CardContent></Card>
      ) : !tecnicos ? <p role="status" className="text-sm text-muted-foreground">Cargando técnicos…</p> : !tecnicos.length ? (
        <Card><CardContent className="p-6 text-sm">
          <p className="font-medium">No hay técnicos activos.</p>
          <p className="mt-1 text-muted-foreground">Créalos con sus especialidades en <Link className="text-primary hover:underline" to="/admin">Clientes y catálogos</Link>.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tecnicos.map((t) => {
            const tono = tonoCarga(t.activas.length, t.cargaMax);
            return (
              <Card key={t.id}>
                <CardHeader className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle>{t.nombre}</CardTitle>
                    {!t.disponible && <Pildora tono="neutral">No disponible</Pildora>}
                  </div>
                  <p className="text-xs text-muted-foreground">{t.especialidades.map((e) => e.nombre).join(', ') || 'Sin especialidades'}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Activas</span>
                      <span className="tabular-nums">{t.activas.length} / {t.cargaMax}{t.activas.length >= t.cargaMax ? ' · sin cupo' : ''}</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-muted" role="meter" aria-valuemin={0} aria-valuemax={t.cargaMax} aria-valuenow={t.activas.length} aria-label={`Carga de ${t.nombre}`}>
                      <div className="h-2 rounded-full" style={{ width: `${Math.min(100, (t.activas.length / t.cargaMax) * 100)}%`, background: `var(--tone-${tono}-dot)` }} />
                    </div>
                  </div>
                  {t.activas.length ? (
                    <ul className="space-y-2">
                      {t.activas.map((s) => (
                        <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                          <Link className="font-mono text-primary hover:underline" to={`/solicitudes/${s.id}`}>{s.codigo}</Link>
                          <span className="flex items-center gap-2">
                            <Pildora tono={ESTADOS[s.estado].tono}>{ESTADOS[s.estado].nombre}</Pildora>
                            <span className="text-xs text-muted-foreground">{new Date(s.fechaLimite) < new Date() ? 'Vencida' : venceEn(s.fechaLimite)}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-sm text-muted-foreground">Sin solicitudes activas.</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
