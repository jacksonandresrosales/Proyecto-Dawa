import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ApiRequestError } from '@/api/admin';
import {
  asignarTecnico, cambiarEstado, descargarAdjunto, listarAdjuntos, listarCategorias, obtenerCarga, obtenerHistorial, obtenerSolicitud, problemaAdjunto, subirAdjunto,
  type Adjunto, type CargaTecnico, type EventoHistorial, type Solicitud,
} from '@/api/solicitudes';
import { useAuth } from '@/auth/AuthContext';
import type { AvisoEnVivo } from '@/api/notificaciones';
import { EVENTO_NOTIFICACION } from '@/components/Campana';
import Modal from '@/components/Modal';
import Pildora from '@/components/Pildora';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ESTADOS, ESTADOS_ASIGNABLES, PLAZOS, accionesPara, fechaHora, tonoPrioridad, type Accion } from '@/lib/solicitudes';

const area = 'mt-1 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring';
const mensajeDe = (e: unknown) => (e instanceof ApiRequestError ? e.message : 'No se pudo completar la acción.');

function Dato({ titulo, children }: { titulo: string; children: ReactNode }) {
  return <div><dt className="text-xs font-medium uppercase text-muted-foreground">{titulo}</dt><dd className="mt-1 text-sm">{children}</dd></div>;
}

export default function SolicitudDetallePage() {
  const id = Number(useParams().id);
  const { user } = useAuth();
  const aviso = (useLocation().state as { aviso?: string } | null)?.aviso;
  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
  const [historial, setHistorial] = useState<EventoHistorial[]>([]);
  const [error, setError] = useState('');
  const [errorAccion, setErrorAccion] = useState<{ mensaje: string; conflicto: boolean } | null>(null);
  const [accion, setAccion] = useState<Accion | null>(null);
  const [texto, setTexto] = useState('');
  const [asignando, setAsignando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [s, h] = await Promise.all([obtenerSolicitud(id), obtenerHistorial(id)]);
      setSolicitud(s);
      setHistorial(h);
      setError('');
    } catch (e) {
      setError(e instanceof ApiRequestError && e.code === 'NO_ENCONTRADO' ? 'La solicitud no existe o no tienes acceso a ella.' : mensajeDe(e));
    }
  }, [id]);

  useEffect(() => { queueMicrotask(() => { void cargar(); }); }, [cargar]);

  // Si otra persona cambia esta solicitud, el aviso SSE la recarga sin que el usuario refresque.
  useEffect(() => {
    const alAviso = (e: Event) => { if ((e as CustomEvent<AvisoEnVivo>).detail.solicitudId === id) void cargar(); };
    window.addEventListener(EVENTO_NOTIFICACION, alAviso);
    return () => window.removeEventListener(EVENTO_NOTIFICACION, alAviso);
  }, [cargar, id]);

  async function ejecutar(objetivo: Accion, contenido?: string) {
    if (!solicitud) return;
    setGuardando(true);
    setErrorAccion(null);
    try {
      const extra = objetivo.pide === 'resolucion' ? { resolucion: contenido } : objetivo.pide ? { comentario: contenido } : {};
      setSolicitud(await cambiarEstado(solicitud.id, { estado: objetivo.estado, version: solicitud.version, ...extra }));
      setHistorial(await obtenerHistorial(solicitud.id));
      setAccion(null);
    } catch (e) {
      setAccion(null);
      setErrorAccion({ mensaje: mensajeDe(e), conflicto: e instanceof ApiRequestError && e.code === 'CONFLICTO_VERSION' });
    } finally {
      setGuardando(false);
    }
  }

  function enviarAccion(event: FormEvent) {
    event.preventDefault();
    if (accion && texto.trim()) void ejecutar(accion, texto.trim());
  }

  if (error) {
    return (
      <Card><CardContent className="space-y-3 p-6">
        <p role="alert">{error}</p>
        <Button asChild variant="outline"><Link to="/solicitudes">Volver a solicitudes</Link></Button>
      </CardContent></Card>
    );
  }
  if (!solicitud || !user) return <p role="status" className="text-sm text-muted-foreground">Cargando solicitud…</p>;

  const acciones = accionesPara(solicitud, user.rol);
  const puedeAsignar = user.rol === 'coordinador' && ESTADOS_ASIGNABLES.includes(solicitud.estado);
  const estado = ESTADOS[solicitud.estado];

  return (
    <>
      <header className="space-y-2">
        <Link to="/solicitudes" className="text-sm text-primary hover:underline">← Solicitudes</Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-xl">{solicitud.codigo}</h1>
          <Pildora tono={estado.tono}>{estado.nombre}</Pildora>
          <Pildora tono={tonoPrioridad(solicitud.prioridad)}>{`Prioridad ${solicitud.prioridad.toLowerCase()}`}</Pildora>
          {solicitud.estadoPlazo && <Pildora tono={PLAZOS[solicitud.estadoPlazo].tono}>{PLAZOS[solicitud.estadoPlazo].nombre}</Pildora>}
        </div>
        <p className="text-lg font-semibold">{solicitud.equipo}</p>
      </header>

      {aviso && <p role="status" className="rounded-lg bg-[var(--tone-success-bg)] px-4 py-3 text-sm text-[var(--tone-success-fg)]">{aviso}</p>}
      {errorAccion && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          <span>{errorAccion.mensaje}</span>
          {errorAccion.conflicto && <Button type="button" variant="outline" onClick={() => { setErrorAccion(null); void cargar(); }}>Recargar solicitud</Button>}
        </div>
      )}

      {(acciones.length > 0 || puedeAsignar) && (
        <div className="flex flex-wrap gap-2" aria-label="Acciones">
          {puedeAsignar && (
            <Button type="button" onClick={() => setAsignando(true)} disabled={guardando}>
              {solicitud.tecnico ? 'Reasignar técnico' : 'Asignar técnico'}
            </Button>
          )}
          {acciones.map((a, i) => (
            <Button
              key={a.estado + a.etiqueta}
              type="button"
              // Una sola acción principal: asignar si existe; si no, la primera de la tabla.
              variant={a.peligro ? 'destructive' : !puedeAsignar && i === 0 ? 'default' : 'outline'}
              disabled={guardando}
              onClick={() => { if (a.pide) { setTexto(''); setAccion(a); } else void ejecutar(a); }}
            >
              {a.etiqueta}
            </Button>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Detalle</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <p className="whitespace-pre-line text-sm">{solicitud.descripcion}</p>
              <dl className="grid gap-4 sm:grid-cols-2">
                {user.rol !== 'cliente' && <Dato titulo="Cliente">{solicitud.cliente.razonSocial}</Dato>}
                <Dato titulo="Sede">{solicitud.sede.nombre}</Dato>
                <Dato titulo="Categoría">{solicitud.categoria.nombre}</Dato>
                <Dato titulo="Técnico">{solicitud.tecnico?.nombre ?? 'Sin asignar'}</Dato>
                <Dato titulo="Registrada"><span className="font-mono">{fechaHora(solicitud.createdAt)}</span></Dato>
                <Dato titulo="Fecha límite"><span className="font-mono">{fechaHora(solicitud.fechaLimite)}</span></Dato>
                {solicitud.resolvedAt && <Dato titulo="Resuelta"><span className="font-mono">{fechaHora(solicitud.resolvedAt)}</span></Dato>}
                {solicitud.closedAt && <Dato titulo="Cerrada"><span className="font-mono">{fechaHora(solicitud.closedAt)}</span></Dato>}
              </dl>
            </CardContent>
          </Card>
          {solicitud.resolucion && (
            <Card>
              <CardHeader><CardTitle>Resolución</CardTitle></CardHeader>
              <CardContent><p className="whitespace-pre-line text-sm">{solicitud.resolucion}</p></CardContent>
            </Card>
          )}
          <Adjuntos
            solicitudId={solicitud.id}
            puedeSubir={['coordinador', 'cliente'].includes(user.rol) && !['cerrada', 'cancelada'].includes(solicitud.estado)}
          />
        </div>

        <Card>
          <CardHeader><CardTitle>Historial</CardTitle></CardHeader>
          <CardContent>
            <ol className="space-y-4">
              {historial.map((h) => (
                <li key={h.id} className="border-l-2 pl-3">
                  <p className="text-sm font-medium">
                    {h.estadoAnterior ? `${ESTADOS[h.estadoAnterior].nombre} → ${ESTADOS[h.estadoNuevo].nombre}` : `${ESTADOS[h.estadoNuevo].nombre}`}
                  </p>
                  <p className="text-xs text-muted-foreground">{h.usuario} · <span className="font-mono">{fechaHora(h.fecha)}</span></p>
                  {h.comentario && <p className="mt-1 text-sm">{h.comentario}</p>}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>

      <Modal open={Boolean(accion)} title={accion?.etiqueta ?? ''} onClose={() => setAccion(null)}>
        <form onSubmit={enviarAccion} className="space-y-4">
          <label className="block text-sm font-medium">
            {accion?.pide === 'resolucion' ? 'Resolución' : 'Comentario'}
            <textarea className={`${area} h-28`} maxLength={accion?.pide === 'resolucion' ? 4000 : 1000} value={texto} onChange={(e) => setTexto(e.target.value)} required autoFocus />
          </label>
          {accion?.ayuda && <p className="text-sm text-muted-foreground">{accion.ayuda}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setAccion(null)}>Volver</Button>
            <Button type="submit" variant={accion?.peligro ? 'destructive' : 'default'} disabled={guardando || !texto.trim()}>{guardando ? 'Guardando…' : accion?.etiqueta}</Button>
          </div>
        </form>
      </Modal>

      {asignando && (
        <AsignarModal
          solicitud={solicitud}
          onClose={() => setAsignando(false)}
          onAsignada={(s) => { setSolicitud(s); setAsignando(false); void obtenerHistorial(s.id).then(setHistorial); }}
        />
      )}
    </>
  );
}

function AsignarModal({ solicitud, onClose, onAsignada }: { solicitud: Solicitud; onClose: () => void; onAsignada: (s: Solicitud) => void }) {
  const [tecnicos, setTecnicos] = useState<CargaTecnico[] | null>(null);
  const [especialidadId, setEspecialidadId] = useState<number | null>(null);
  const [tecnicoId, setTecnicoId] = useState(0);
  const [justificacion, setJustificacion] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const reasignacion = Boolean(solicitud.tecnico);

  useEffect(() => {
    // La especialidad requerida está en la categoría; se lee de /categorias.
    Promise.all([obtenerCarga(), listarCategorias()])
      .then(([t, categorias]) => {
        setTecnicos(t);
        setEspecialidadId(categorias.find((c) => c.id === solicitud.categoria.id)?.especialidadId ?? null);
      })
      .catch((e: unknown) => setError(mensajeDe(e)));
  }, [solicitud.categoria.id]);

  // Mismas tres condiciones que valida la API (regla 5): especialidad, disponibilidad y cupo.
  const motivo = (t: CargaTecnico) => (!t.especialidades.some((e) => e.id === especialidadId) ? 'Sin especialidad'
    : !t.disponible ? 'No disponible' : t.activas.length >= t.cargaMax ? 'Sin cupo' : '');
  const apto = (t: CargaTecnico) => !motivo(t);
  const ordenados = [...(tecnicos ?? [])].sort((a, b) => Number(apto(b)) - Number(apto(a)));

  async function enviar(event: FormEvent) {
    event.preventDefault();
    setGuardando(true);
    setError('');
    try {
      onAsignada(await asignarTecnico(solicitud.id, { tecnicoId, ...(reasignacion ? { justificacion: justificacion.trim() } : {}) }));
    } catch (e) {
      setError(mensajeDe(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal open title={reasignacion ? 'Reasignar técnico' : 'Asignar técnico'} onClose={onClose}>
      <form onSubmit={enviar} className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Se requiere la especialidad de <strong>{solicitud.categoria.nombre}</strong>, disponibilidad y carga por debajo del máximo. La API vuelve a validarlo al confirmar.
        </p>
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
        {!tecnicos ? <p role="status" className="text-sm text-muted-foreground">Cargando técnicos…</p> : (
          <fieldset className="max-h-72 space-y-2 overflow-y-auto">
            <legend className="sr-only">Técnicos</legend>
            {ordenados.map((t) => (
              <label key={t.id} className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${apto(t) ? 'cursor-pointer hover:bg-accent' : 'opacity-60'}`}>
                <span className="flex items-center gap-2">
                  <input type="radio" name="tecnico" value={t.id} checked={tecnicoId === t.id} disabled={!apto(t) || t.id === solicitud.tecnico?.id} onChange={() => setTecnicoId(t.id)} />
                  <span><span className="font-medium">{t.nombre}</span><span className="block text-xs text-muted-foreground">{t.especialidades.map((e) => e.nombre).join(', ')}</span></span>
                </span>
                <span className="text-right text-xs text-muted-foreground">
                  <span className="block tabular-nums">{t.activas.length} / {t.cargaMax} activas</span>
                  {t.id === solicitud.tecnico?.id ? 'Actual' : motivo(t) || 'Apto'}
                </span>
              </label>
            ))}
          </fieldset>
        )}
        {reasignacion && (
          <label className="block text-sm font-medium">Justificación
            <textarea className={`${area} h-20`} maxLength={1000} value={justificacion} onChange={(e) => setJustificacion(e.target.value)} required />
          </label>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Volver</Button>
          <Button type="submit" disabled={guardando || !tecnicoId || (reasignacion && !justificacion.trim())}>{guardando ? 'Guardando…' : 'Confirmar'}</Button>
        </div>
      </form>
    </Modal>
  );
}

const kb = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

function Adjuntos({ solicitudId, puedeSubir }: { solicitudId: number; puedeSubir: boolean }) {
  const [lista, setLista] = useState<Adjunto[] | null>(null);
  const [error, setError] = useState('');
  const [subiendo, setSubiendo] = useState(false);

  const cargar = useCallback(() => listarAdjuntos(solicitudId).then(setLista).catch((e: unknown) => setError(mensajeDe(e))), [solicitudId]);
  useEffect(() => { queueMicrotask(() => { void cargar(); }); }, [cargar]);

  async function elegir(archivos: FileList | null) {
    if (!archivos?.length || !lista) return;
    setError('');
    setSubiendo(true);
    let subidos = lista.length;
    const problemas: string[] = [];
    for (const archivo of Array.from(archivos)) {
      const problema = problemaAdjunto(archivo, subidos);
      if (problema) { problemas.push(problema); continue; }
      try { await subirAdjunto(solicitudId, archivo); subidos += 1; } catch (e) { problemas.push(`${archivo.name}: ${mensajeDe(e)}`); }
    }
    setError(problemas.join(' '));
    setSubiendo(false);
    void cargar();
  }

  return (
    <Card>
      <CardHeader><CardTitle>Adjuntos</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
        {!lista ? <p role="status" className="text-sm text-muted-foreground">Cargando adjuntos…</p> : !lista.length ? (
          <p className="text-sm text-muted-foreground">No hay archivos adjuntos.</p>
        ) : (
          <ul className="space-y-2">
            {lista.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <button type="button" className="text-left text-primary hover:underline" onClick={() => { void descargarAdjunto(solicitudId, a).catch((e: unknown) => setError(mensajeDe(e))); }}>
                  {a.nombre}
                </button>
                <span className="text-xs text-muted-foreground">{kb(a.tamano)} · {a.subidoPor} · <span className="font-mono">{fechaHora(a.createdAt)}</span></span>
              </li>
            ))}
          </ul>
        )}
        {puedeSubir && (
          <label className="block text-sm">
            <span className="font-medium">Adjuntar archivos</span>
            <span className="block text-xs text-muted-foreground">PDF, PNG, JPG, WEBP o TXT · hasta 5 MB cada uno · máximo 5 por solicitud</span>
            <input
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.webp,.txt"
              disabled={subiendo || !lista || lista.length >= 5}
              className="mt-2 block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm"
              onChange={(e) => { void elegir(e.target.files); e.target.value = ''; }}
            />
            {subiendo && <span role="status" className="mt-1 block text-xs text-muted-foreground">Subiendo…</span>}
          </label>
        )}
      </CardContent>
    </Card>
  );
}
