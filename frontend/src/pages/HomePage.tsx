import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiRequestError } from '@/api/admin';
import { obtenerIndicadores, type Indicadores } from '@/api/dashboard';
import { listarCategorias, listarClientes, listarSolicitudes, listarTecnicos, type Solicitud } from '@/api/solicitudes';
import { useAuth, type AuthUser } from '@/auth/AuthContext';
import Pildora from '@/components/Pildora';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ESTADOS, venceEn } from '@/lib/solicitudes';

type Contador = { etiqueta: string; valor: number | string; enlace: string; destacado?: boolean };
type Paso = { texto: string; enlace: string; hecho: boolean };
type Resumen = { contadores: Contador[]; pasos: Paso[]; recientes: Solicitud[]; proximas: Indicadores['proximasAVencer'] };

const TERMINADAS = ['resuelta', 'cerrada', 'cancelada'];
const contar = (lista: Solicitud[], estado: string) => lista.filter((s) => s.estado === estado).length;
const porEstado = (ind: Indicadores, estado: string) => ind.porEstado.find((e) => e.estado === estado)?.cantidad ?? 0;
const filtro = (estado: string) => `/solicitudes?estado=${estado}`;

// Pasos de docs/ux/07-onboarding.md: se marcan hechos con datos de la API, no con clics.
async function cargarResumen(user: AuthUser): Promise<Resumen> {
  if (user.rol === 'admin' || user.rol === 'coordinador') {
    const ind = await obtenerIndicadores(new URLSearchParams());
    const asignadasAlgunaVez = ['asignada', 'en_proceso', 'pendiente_info', 'resuelta', 'cerrada'].some((e) => porEstado(ind, e) > 0);
    const contadores: Contador[] = [
      { etiqueta: 'Por aprobar', valor: porEstado(ind, 'registrada'), enlace: filtro('registrada'), destacado: porEstado(ind, 'registrada') > 0 },
      { etiqueta: 'Por asignar', valor: porEstado(ind, 'aprobada'), enlace: filtro('aprobada'), destacado: porEstado(ind, 'aprobada') > 0 },
      { etiqueta: 'Por cerrar', valor: porEstado(ind, 'resuelta'), enlace: filtro('resuelta') },
      { etiqueta: 'Vencidas', valor: ind.vencidas, enlace: '/dashboard', destacado: ind.vencidas > 0 },
    ];
    if (user.rol === 'coordinador') {
      return {
        contadores,
        pasos: [
          { texto: 'Revisar las solicitudes por aprobar', enlace: filtro('registrada'), hecho: ind.total > porEstado(ind, 'registrada') },
          { texto: 'Conocer la carga de los técnicos', enlace: '/tecnicos/carga', hecho: asignadasAlgunaVez },
          { texto: 'Asignar la primera solicitud', enlace: filtro('aprobada'), hecho: asignadasAlgunaVez },
        ],
        recientes: [],
        proximas: ind.proximasAVencer,
      };
    }
    const [categorias, tecnicos, clientes] = await Promise.all([listarCategorias(), listarTecnicos(), listarClientes()]);
    return {
      contadores,
      pasos: [
        { texto: 'Revisar categorías y plazos por prioridad', enlace: '/admin', hecho: categorias.length > 0 },
        { texto: 'Crear técnicos con sus especialidades', enlace: '/admin', hecho: tecnicos.length > 0 },
        { texto: 'Crear clientes, sedes y sus usuarios', enlace: '/admin', hecho: clientes.length > 0 },
      ],
      recientes: [],
      proximas: ind.proximasAVencer,
    };
  }

  // shortcut: el resumen del técnico y del cliente cuenta sus últimas 100 solicitudes; con más, usar un endpoint de conteos.
  const lista = (await listarSolicitudes(new URLSearchParams({ limit: '100' }))).data;
  const perfil = { texto: 'Completar tu teléfono en el perfil', enlace: '/perfil', hecho: Boolean(user.telefono) };
  if (user.rol === 'tecnico') {
    return {
      contadores: [
        { etiqueta: 'Por iniciar', valor: contar(lista, 'asignada'), enlace: filtro('asignada'), destacado: contar(lista, 'asignada') > 0 },
        { etiqueta: 'En proceso', valor: contar(lista, 'en_proceso'), enlace: filtro('en_proceso') },
        { etiqueta: 'Esperando al cliente', valor: contar(lista, 'pendiente_info'), enlace: filtro('pendiente_info') },
      ],
      pasos: [
        perfil,
        { texto: 'Abrir tu primera solicitud asignada', enlace: '/solicitudes', hecho: lista.length > 0 },
        { texto: 'Registrar avance o resolverla', enlace: '/solicitudes', hecho: lista.some((s) => s.estado !== 'asignada') },
      ],
      recientes: lista.slice(0, 5),
      proximas: [],
    };
  }
  return {
    contadores: [
      { etiqueta: 'Te piden información', valor: contar(lista, 'pendiente_info'), enlace: filtro('pendiente_info'), destacado: contar(lista, 'pendiente_info') > 0 },
      { etiqueta: 'Abiertas', valor: lista.filter((s) => !TERMINADAS.includes(s.estado)).length, enlace: '/solicitudes' },
      { etiqueta: 'Resueltas', valor: contar(lista, 'resuelta') + contar(lista, 'cerrada'), enlace: filtro('cerrada') },
    ],
    pasos: [
      perfil,
      { texto: 'Registrar tu primera solicitud', enlace: '/solicitudes/nueva', hecho: lista.length > 0 },
      { texto: 'Ver su estado e historial', enlace: '/solicitudes', hecho: lista.some((s) => s.estado !== 'registrada') },
    ],
    recientes: lista.slice(0, 5),
    proximas: [],
  };
}

function leerOculto(clave: string) {
  try { return localStorage.getItem(clave) === '1'; } catch { return false; }
}

function PrimerosPasos({ pasos, usuarioId }: { pasos: Paso[]; usuarioId: number }) {
  // shortcut: "Ocultar" vive en localStorage por usuario; si se borra el navegador, vuelve a aparecer.
  const clave = `servigest:primeros-pasos-ocultos:${usuarioId}`;
  const [oculto, setOculto] = useState(() => leerOculto(clave));
  const hechos = pasos.filter((p) => p.hecho).length;
  if (oculto || hechos === pasos.length) return null;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Primeros pasos</CardTitle>
          <Button type="button" variant="ghost" size="sm" onClick={() => { try { localStorage.setItem(clave, '1'); } catch { /* sin almacenamiento: solo se oculta ahora */ } setOculto(true); }}>Ocultar</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-sm text-muted-foreground">{hechos} de {pasos.length}</p>
          <div className="mt-1 h-2 rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={pasos.length} aria-valuenow={hechos} aria-label="Primeros pasos completados">
            <div className="h-2 rounded-full bg-primary" style={{ width: `${(hechos / pasos.length) * 100}%` }} />
          </div>
        </div>
        <ol className="space-y-2">
          {pasos.map((p, i) => (
            <li key={p.texto} className="flex items-center gap-3 text-sm">
              <span aria-hidden="true" className={`grid size-6 shrink-0 place-items-center rounded-full text-xs ${p.hecho ? 'bg-primary text-primary-foreground' : 'border'}`}>{p.hecho ? '✓' : i + 1}</span>
              {p.hecho ? <span className="text-muted-foreground line-through">{p.texto}</span> : <Link className="text-primary hover:underline" to={p.enlace}>{p.texto}</Link>}
              <span className="sr-only">{p.hecho ? '(hecho)' : '(pendiente)'}</span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

const SALUDO: Record<AuthUser['rol'], string> = {
  admin: 'Configura el sistema y revisa los indicadores.',
  coordinador: 'Aprueba, asigna y vigila los plazos.',
  tecnico: 'Atiende las solicitudes que te asignan.',
  cliente: 'Registra y sigue tus solicitudes de servicio.',
};

export default function HomePage() {
  const { user } = useAuth();
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    let activo = true;
    cargarResumen(user)
      .then((r) => { if (activo) setResumen(r); })
      .catch((e: unknown) => { if (activo) setError(e instanceof ApiRequestError ? e.message : 'No se pudo cargar tu resumen.'); });
    return () => { activo = false; };
  }, [user]);

  if (!user) return null;
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Inicio</p>
          <h1 className="mt-1 text-xl font-medium">Hola, {user.nombre}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{SALUDO[user.rol]}</p>
        </div>
        {(user.rol === 'cliente' || user.rol === 'coordinador') && <Button asChild><Link to="/solicitudes/nueva">Nueva solicitud</Link></Button>}
      </header>

      {error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      {!resumen ? !error && <p role="status" className="text-sm text-muted-foreground">Cargando tu resumen…</p> : (
        <>
          <PrimerosPasos pasos={resumen.pasos} usuarioId={user.id} />
          <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Resumen">
            {resumen.contadores.map((c) => (
              <Link key={c.etiqueta} to={c.enlace} className="rounded-xl border bg-card p-4 hover:bg-accent">
                <span className="block text-xs font-medium uppercase text-muted-foreground">{c.etiqueta}</span>
                <span className={`mt-1 block text-xl font-medium tabular-nums ${c.destacado ? 'text-primary' : ''}`}>{c.valor}</span>
              </Link>
            ))}
          </section>

          {resumen.recientes.length > 0 && (
            <Card>
              <CardHeader><CardTitle>{user.rol === 'tecnico' ? 'Tus solicitudes recientes' : 'Tus últimas solicitudes'}</CardTitle></CardHeader>
              <CardContent>
                <ul className="divide-y">
                  {resumen.recientes.map((s) => (
                    <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                      <span><Link className="font-mono text-primary hover:underline" to={`/solicitudes/${s.id}`}>{s.codigo}</Link> · {s.equipo}</span>
                      <Pildora tono={ESTADOS[s.estado].tono}>{ESTADOS[s.estado].nombre}</Pildora>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          {resumen.proximas.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Próximas a vencer</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {resumen.proximas.map((p) => (
                    <li key={p.id} className="flex justify-between gap-3 text-sm">
                      <Link className="font-mono text-primary hover:underline" to={`/solicitudes/${p.id}`}>{p.codigo}</Link>
                      <span className="text-muted-foreground">{venceEn(p.fechaLimite)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          {resumen.recientes.length === 0 && user.rol === 'cliente' && (
            <Card><CardContent className="p-6 text-sm">
              <p className="font-medium">Todavía no registraste solicitudes.</p>
              <p className="mt-1 text-muted-foreground">Cuando algo falle, regístralo aquí y sigue su avance hasta que se cierre.</p>
            </CardContent></Card>
          )}
          {resumen.recientes.length === 0 && user.rol === 'tecnico' && (
            <Card><CardContent className="p-6 text-sm">
              <p className="font-medium">No tienes solicitudes asignadas.</p>
              <p className="mt-1 text-muted-foreground">Cuando el coordinador te asigne una, te llegará un aviso a la campana.</p>
            </CardContent></Card>
          )}
        </>
      )}
    </>
  );
}
