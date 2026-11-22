import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiRequestError } from '@/api/admin';
import { MAX_ADJUNTOS, crearSolicitud, listarCategorias, listarClientes, listarPrioridades, listarSedes, problemaAdjunto, subirAdjunto, type Opcion, type Sede } from '@/api/solicitudes';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const campo = 'mt-1 h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring aria-invalid:border-destructive';
const etiqueta = 'block text-sm font-medium';
type Errores = Partial<Record<'clienteId' | 'sedeId' | 'categoriaId' | 'prioridadId' | 'equipo' | 'descripcion', string>>;

export default function NuevaSolicitudPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const esCoordinador = user?.rol === 'coordinador';
  const [clientes, setClientes] = useState<{ id: number; razonSocial: string }[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [categorias, setCategorias] = useState<Opcion[]>([]);
  const [prioridades, setPrioridades] = useState<(Opcion & { horasSla: number })[]>([]);
  const [valores, setValores] = useState({ clienteId: '', sedeId: '', categoriaId: '', prioridadId: '', equipo: '', descripcion: '' });
  const [errores, setErrores] = useState<Errores>({});
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [archivos, setArchivos] = useState<File[]>([]);
  const [errorArchivos, setErrorArchivos] = useState('');

  function elegirArchivos(lista: FileList | null) {
    const aceptados = [...archivos];
    const problemas: string[] = [];
    for (const archivo of Array.from(lista ?? [])) {
      const problema = problemaAdjunto(archivo, aceptados.length);
      if (problema) problemas.push(problema); else aceptados.push(archivo);
    }
    setArchivos(aceptados);
    setErrorArchivos(problemas.join(' '));
  }
  const clienteId = esCoordinador ? Number(valores.clienteId) : user?.clienteId ?? 0;

  useEffect(() => {
    Promise.all([listarCategorias(), listarPrioridades(), esCoordinador ? listarClientes() : Promise.resolve([])])
      .then(([c, p, cl]) => { setCategorias(c); setPrioridades(p); setClientes(cl); })
      .catch(() => setError('No se pudieron cargar los catálogos. Recarga la página.'));
  }, [esCoordinador]);

  useEffect(() => {
    if (!clienteId) return;
    // Una respuesta vieja (otro cliente, o el doble efecto de React en desarrollo) no debe tocar el formulario.
    let vigente = true;
    listarSedes(clienteId)
      .then((lista) => {
        if (!vigente) return;
        setSedes(lista);
        // Con una sola sede no hay nada que elegir; una sede ya elegida y válida se respeta.
        setValores((v) => ({
          ...v,
          sedeId: lista.length === 1 ? String(lista[0].id) : lista.some((s) => String(s.id) === v.sedeId) ? v.sedeId : '',
        }));
      })
      .catch(() => { if (vigente) setError('No se pudieron cargar las sedes.'); });
    return () => { vigente = false; };
  }, [clienteId]);

  const cambiar = (clave: keyof typeof valores) => (e: { target: { value: string } }) => {
    setValores({ ...valores, [clave]: e.target.value });
    setErrores({ ...errores, [clave]: undefined });
  };

  function validar() {
    const e: Errores = {};
    if (esCoordinador && !valores.clienteId) e.clienteId = 'Elige el cliente';
    if (!valores.sedeId) e.sedeId = 'Elige la sede';
    if (!valores.categoriaId) e.categoriaId = 'Elige la categoría';
    if (!valores.prioridadId) e.prioridadId = 'Elige la prioridad';
    if (!valores.equipo.trim()) e.equipo = 'Indica el equipo o recurso afectado';
    if (valores.descripcion.trim().length < 10) e.descripcion = 'Describe el problema con al menos 10 caracteres';
    return e;
  }

  async function enviar(event: FormEvent) {
    event.preventDefault();
    const e = validar();
    setErrores(e);
    if (Object.keys(e).length) return;
    setGuardando(true);
    setError('');
    try {
      const creada = await crearSolicitud({
        ...(esCoordinador ? { clienteId } : {}),
        sedeId: Number(valores.sedeId),
        categoriaId: Number(valores.categoriaId),
        prioridadId: Number(valores.prioridadId),
        equipo: valores.equipo.trim(),
        descripcion: valores.descripcion.trim(),
      });
      // La solicitud ya existe: un adjunto que falle no la deshace, solo se avisa.
      const fallidos: string[] = [];
      for (const archivo of archivos) await subirAdjunto(creada.id, archivo).catch(() => fallidos.push(archivo.name));
      const aviso = `Solicitud ${creada.codigo} registrada.${fallidos.length ? ` No se pudo adjuntar: ${fallidos.join(', ')}. Puedes intentarlo desde aquí.` : ''}`;
      navigate(`/solicitudes/${creada.id}`, { state: { aviso } });
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo registrar la solicitud. Lo escrito se conserva.');
    } finally {
      setGuardando(false);
    }
  }

  const mensaje = (clave: keyof Errores) => errores[clave] && <p id={`${clave}-error`} className="mt-1 text-sm text-destructive">{errores[clave]}</p>;
  const invalido = (clave: keyof Errores) => ({ 'aria-invalid': Boolean(errores[clave]), 'aria-describedby': errores[clave] ? `${clave}-error` : undefined });

  return (
    <>
      <header>
        <Link to="/solicitudes" className="text-sm text-primary hover:underline">← Solicitudes</Link>
        <h1 className="mt-2 text-xl font-medium">Nueva solicitud</h1>
        <p className="mt-1 text-sm text-muted-foreground">El plazo de atención se calcula según la prioridad.</p>
      </header>
      <Card className="max-w-2xl">
        <CardHeader><CardTitle>Datos del servicio</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={enviar} noValidate className="space-y-4">
            {error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
            {esCoordinador && (
              <label className={etiqueta}>Cliente
                <select className={campo} value={valores.clienteId} onChange={cambiar('clienteId')} {...invalido('clienteId')}>
                  <option value="">Elige un cliente</option>
                  {clientes.map((c) => <option key={c.id} value={c.id}>{c.razonSocial}</option>)}
                </select>
                {mensaje('clienteId')}
              </label>
            )}
            <label className={etiqueta}>Sede
              <select className={campo} value={valores.sedeId} onChange={cambiar('sedeId')} disabled={!clienteId} {...invalido('sedeId')}>
                <option value="">{clienteId ? 'Elige una sede' : 'Primero elige el cliente'}</option>
                {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre} · {s.direccion}</option>)}
              </select>
              {mensaje('sedeId')}
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={etiqueta}>Categoría
                <select className={campo} value={valores.categoriaId} onChange={cambiar('categoriaId')} {...invalido('categoriaId')}>
                  <option value="">Elige una categoría</option>
                  {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
                {mensaje('categoriaId')}
              </label>
              <label className={etiqueta}>Prioridad
                <select className={campo} value={valores.prioridadId} onChange={cambiar('prioridadId')} {...invalido('prioridadId')}>
                  <option value="">Elige una prioridad</option>
                  {prioridades.map((p) => <option key={p.id} value={p.id}>{p.nombre} · {p.horasSla} h</option>)}
                </select>
                {mensaje('prioridadId')}
              </label>
            </div>
            <label className={etiqueta}>Equipo o recurso afectado
              <input className={campo} maxLength={160} placeholder="Nombre o código del equipo" value={valores.equipo} onChange={cambiar('equipo')} {...invalido('equipo')} />
              {mensaje('equipo')}
            </label>
            <label className={etiqueta}>Descripción
              <textarea className={`${campo} h-32 py-2`} maxLength={4000} placeholder="¿Qué ocurre y desde cuándo?" value={valores.descripcion} onChange={cambiar('descripcion')} {...invalido('descripcion')} />
              {mensaje('descripcion')}
            </label>
            <div className="text-sm">
              <label className="font-medium" htmlFor="adjuntos">Adjuntos (opcional)</label>
              <p className="text-xs text-muted-foreground">PDF, PNG, JPG, WEBP o TXT · hasta 5 MB cada uno · máximo 5</p>
              <input
                id="adjuntos"
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.webp,.txt"
                disabled={archivos.length >= MAX_ADJUNTOS}
                className="mt-2 block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm"
                onChange={(e) => { elegirArchivos(e.target.files); e.target.value = ''; }}
              />
              {errorArchivos && <p className="mt-1 text-sm text-destructive">{errorArchivos}</p>}
              {archivos.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {archivos.map((a, i) => (
                    <li key={a.name + i} className="flex items-center justify-between gap-2">
                      <span className="truncate">{a.name}</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setArchivos(archivos.filter((_, j) => j !== i))}>Quitar</Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={guardando}>{guardando ? 'Registrando…' : 'Registrar solicitud'}</Button>
              <Button asChild variant="outline"><Link to="/solicitudes">Cancelar</Link></Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
