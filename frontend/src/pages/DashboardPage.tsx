import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiRequestError } from '@/api/admin';
import { obtenerIndicadores, type Indicadores } from '@/api/dashboard';
import { listarCategorias, listarClientes, listarTecnicos, type Opcion, type TecnicoOpcion } from '@/api/solicitudes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ESTADOS, tonoPrioridad, venceEn, type Tono } from '@/lib/solicitudes';

// Paleta del gráfico de evolución validada (claro y oscuro) con la guía de visualización.
const COLOR_CREADAS = '#2567FF';
const COLOR_RESUELTAS = '#24A148';
const PERIODOS = [{ id: '7', nombre: '7 días' }, { id: '30', nombre: '30 días' }, { id: 'todo', nombre: 'Todo' }];
const campo = 'h-9 rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring';

const isoLocal = (fecha: Date) => `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
function desdePeriodo(periodo: string) {
  if (periodo === 'todo') return '';
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - (Number(periodo) - 1));
  return isoLocal(fecha);
}

function Kpi({ titulo, valor, nota }: { titulo: string; valor: string; nota?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase text-muted-foreground">{titulo}</p>
        <p className="mt-1 text-xl font-medium tabular-nums">{valor}</p>
        {nota && <p className="text-xs text-muted-foreground">{nota}</p>}
      </CardContent>
    </Card>
  );
}

// Barras horizontales con nombre y número escritos: el color acompaña, nunca es la única señal.
function Barras({ filas }: { filas: { nombre: string; valor: number; max: number; tono: Tono; detalle?: string }[] }) {
  return (
    <ul className="space-y-3">
      {filas.map((f) => (
        <li key={f.nombre} title={`${f.nombre}: ${f.detalle ?? f.valor}`}>
          <div className="flex justify-between text-sm"><span>{f.nombre}</span><span className="tabular-nums text-muted-foreground">{f.detalle ?? f.valor}</span></div>
          <div className="mt-1 h-2 rounded-full bg-muted">
            <div className="h-2 rounded-full" style={{ width: `${f.max ? Math.min(100, (f.valor / f.max) * 100) : 0}%`, background: `var(--tone-${f.tono}-dot)` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Evolucion({ filas }: { filas: Indicadores['evolucion'] }) {
  const [activo, setActivo] = useState<number | null>(null);
  const alto = 160;
  const ancho = Math.max(filas.length * 24, 300);
  const max = Math.max(1, ...filas.flatMap((f) => [f.creadas, f.resueltas]));
  const tope = Math.ceil(max / 2) * 2;
  const y = (v: number) => alto - (v / tope) * alto;
  const paso = ancho / filas.length;
  const barra = Math.max(2, Math.min(10, paso / 2 - 3));
  const cadaEtiqueta = Math.ceil(filas.length / 8);
  const dia = (fecha: string) => new Date(`${fecha}T12:00:00`).toLocaleDateString('es-EC', { day: 'numeric', month: 'short' });
  const fila = activo === null ? null : filas[activo];

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: COLOR_CREADAS }} />Creadas</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: COLOR_RESUELTAS }} />Resueltas</span>
        <span className="ml-auto tabular-nums" aria-live="polite">{fila ? `${dia(fila.fecha)} · ${fila.creadas} creadas · ${fila.resueltas} resueltas` : 'Pasa el cursor sobre un día'}</span>
      </div>
      <svg viewBox={`-28 -8 ${ancho + 36} ${alto + 30}`} className="h-56 w-full" role="img" aria-label="Solicitudes creadas y resueltas por día" onMouseLeave={() => setActivo(null)}>
        {[0, tope / 2, tope].map((v) => (
          <g key={v}>
            <line x1={0} x2={ancho} y1={y(v)} y2={y(v)} stroke="currentColor" strokeOpacity={0.12} />
            <text x={-6} y={y(v) + 4} textAnchor="end" fontSize={10} fill="currentColor" fillOpacity={0.6}>{v}</text>
          </g>
        ))}
        {filas.map((f, i) => {
          const x = i * paso + paso / 2;
          return (
            <g key={f.fecha} onMouseEnter={() => setActivo(i)}>
              <rect x={i * paso} y={0} width={paso} height={alto} fill={activo === i ? 'currentColor' : 'transparent'} fillOpacity={0.05} />
              {f.creadas > 0 && <rect x={x - barra - 1} y={y(f.creadas)} width={barra} height={alto - y(f.creadas)} rx={2} fill={COLOR_CREADAS} />}
              {f.resueltas > 0 && <rect x={x + 1} y={y(f.resueltas)} width={barra} height={alto - y(f.resueltas)} rx={2} fill={COLOR_RESUELTAS} />}
              {i % cadaEtiqueta === 0 && <text x={x} y={alto + 18} textAnchor="middle" fontSize={10} fill="currentColor" fillOpacity={0.6}>{dia(f.fecha)}</text>}
            </g>
          );
        })}
      </svg>
      {/* sr-only va en el div: una <table> ignora alto y overflow y estiraría la página. */}
      <div className="sr-only">
        <table>
          <caption>Solicitudes creadas y resueltas por día</caption>
          <thead><tr><th>Fecha</th><th>Creadas</th><th>Resueltas</th></tr></thead>
          <tbody>{filas.map((f) => <tr key={f.fecha}><td>{f.fecha}</td><td>{f.creadas}</td><td>{f.resueltas}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [filtros, setFiltros] = useState({ periodo: '30', categoria: '', tecnico: '', cliente: '' });
  const [datos, setDatos] = useState<Indicadores | null>(null);
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);
  const [opciones, setOpciones] = useState<{ categorias: Opcion[]; tecnicos: TecnicoOpcion[]; clientes: { id: number; razonSocial: string }[] }>({ categorias: [], tecnicos: [], clientes: [] });

  useEffect(() => {
    Promise.all([listarCategorias(), listarTecnicos(), listarClientes()])
      .then(([categorias, tecnicos, clientes]) => setOpciones({ categorias, tecnicos, clientes }))
      .catch(() => undefined); // sin opciones, el dashboard sigue funcionando sin esos filtros
  }, []);

  useEffect(() => {
    let activo = true;
    const params = new URLSearchParams();
    const desde = desdePeriodo(filtros.periodo);
    if (desde) params.set('desde', desde);
    for (const clave of ['categoria', 'tecnico', 'cliente'] as const) if (filtros[clave]) params.set(clave, filtros[clave]);
    obtenerIndicadores(params)
      .then((d) => { if (activo) { setDatos(d); setError(''); } })
      .catch((e: unknown) => { if (activo) setError(e instanceof ApiRequestError ? e.message : 'No se pudieron cargar los indicadores.'); });
    return () => { activo = false; };
  }, [filtros, intento]);

  const cambiar = (clave: keyof typeof filtros, valor: string) => setFiltros((f) => ({ ...f, [clave]: valor }));

  return (
    <>
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Dashboard</p>
        <h1 className="mt-1 text-xl font-medium">Indicadores de servicio</h1>
      </header>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtros del dashboard">
        <div className="flex rounded-full border p-0.5 whitespace-nowrap" aria-label="Periodo">
          {PERIODOS.map((p) => (
            <button key={p.id} type="button" aria-pressed={filtros.periodo === p.id} onClick={() => cambiar('periodo', p.id)}
              className={`rounded-full px-3 py-1 text-sm ${filtros.periodo === p.id ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>{p.nombre}</button>
          ))}
        </div>
        <select aria-label="Categoría" className={campo} value={filtros.categoria} onChange={(e) => cambiar('categoria', e.target.value)}>
          <option value="">Categoría: todas</option>
          {opciones.categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <select aria-label="Técnico" className={campo} value={filtros.tecnico} onChange={(e) => cambiar('tecnico', e.target.value)}>
          <option value="">Técnico: todos</option>
          {opciones.tecnicos.map((t) => <option key={t.id} value={t.id}>{t.usuario.nombre}</option>)}
        </select>
        <select aria-label="Cliente" className={campo} value={filtros.cliente} onChange={(e) => cambiar('cliente', e.target.value)}>
          <option value="">Cliente: todos</option>
          {opciones.clientes.map((c) => <option key={c.id} value={c.id}>{c.razonSocial}</option>)}
        </select>
      </div>

      {error ? (
        <Card><CardContent role="alert" className="flex flex-wrap items-center justify-between gap-3 p-6 text-sm">
          <span>{error}</span><Button type="button" variant="outline" onClick={() => setIntento((n) => n + 1)}>Reintentar</Button>
        </CardContent></Card>
      ) : !datos ? <p role="status" className="text-sm text-muted-foreground">Calculando indicadores…</p> : datos.total === 0 ? (
        <Card><CardContent className="p-6 text-sm">
          <p className="font-medium">No hay solicitudes en este periodo.</p>
          <p className="mt-1 text-muted-foreground">Amplía el periodo o quita filtros para ver indicadores.</p>
        </CardContent></Card>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-4 lg:grid-cols-5" aria-label="Indicadores principales">
            <Kpi titulo="Total" valor={String(datos.total)} />
            <Kpi titulo="Abiertas" valor={String(datos.abiertas)} nota={`${datos.porVencer} por vencer`} />
            <Kpi titulo="Vencidas" valor={String(datos.vencidas)} nota="abiertas fuera de plazo" />
            <Kpi titulo="Cumplimiento de plazo" valor={datos.cumplimientoPlazo === null ? '—' : `${Math.round(datos.cumplimientoPlazo * 100)} %`} nota="de las resueltas" />
            <Kpi titulo="Tiempo promedio de resolución" valor={datos.tiempoPromedioResolucionHoras === null ? '—' : `${datos.tiempoPromedioResolucionHoras.toLocaleString('es-EC')} h`} />
          </section>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader><CardTitle>Por estado</CardTitle></CardHeader>
              <CardContent><Barras filas={datos.porEstado.map((e) => ({ nombre: ESTADOS[e.estado].nombre, valor: e.cantidad, max: datos.total, tono: ESTADOS[e.estado].tono }))} /></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Por prioridad</CardTitle></CardHeader>
              <CardContent><Barras filas={datos.porPrioridad.map((p) => ({ nombre: p.prioridad, valor: p.cantidad, max: datos.total, tono: tonoPrioridad(p.prioridad) === 'critical' ? 'danger' : tonoPrioridad(p.prioridad) }))} /></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Carga por técnico (activas)</CardTitle></CardHeader>
              <CardContent>
                <Barras filas={datos.cargaPorTecnico.map((t) => ({
                  nombre: t.disponible ? t.tecnico : `${t.tecnico} (no disponible)`,
                  valor: t.activas,
                  max: t.cargaMax,
                  tono: t.activas >= t.cargaMax ? 'danger' : t.activas >= t.cargaMax * 0.8 ? 'warning' : 'info',
                  detalle: `${t.activas} / ${t.cargaMax}`,
                }))} />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <Card>
              <CardHeader><CardTitle>Creadas y resueltas por día</CardTitle></CardHeader>
              <CardContent><Evolucion filas={datos.evolucion} /></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Próximas a vencer</CardTitle></CardHeader>
              <CardContent>
                {datos.proximasAVencer.length ? (
                  <ul className="space-y-3">
                    {datos.proximasAVencer.map((p) => (
                      <li key={p.id} className="flex justify-between gap-3 text-sm">
                        <Link className="font-mono text-primary hover:underline" to={`/solicitudes/${p.id}`}>{p.codigo}</Link>
                        <span className="text-muted-foreground">{venceEn(p.fechaLimite)}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-muted-foreground">Ninguna solicitud abierta tiene el plazo por delante.</p>}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
