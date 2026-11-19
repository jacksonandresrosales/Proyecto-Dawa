import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiRequestError, apiRequest, type ApiList } from '@/api/admin';
import { useAuth } from '@/auth/AuthContext';

type UserInfo = { nombre: string; email: string; telefono?: string | null; activo: boolean };
type Cliente = {
  id: number;
  razonSocial: string;
  ruc: string;
  activo: boolean;
  usuario: UserInfo;
  sedes: { id: number; nombre: string; direccion: string }[];
};
type Especialidad = { id: number; nombre: string; activo: boolean };
type Tecnico = {
  id: number;
  disponible: boolean;
  cargaMax: number;
  usuario: UserInfo;
  especialidades: { especialidadId: number; especialidad: Especialidad }[];
};
type Catalogo = Especialidad & { especialidadId?: number; especialidad?: Especialidad; horasSla?: number };
type ItemActions<T> = {
  onEdit: (item: T) => void;
  onToggle: (item: T) => void;
  onDelete: (item: T) => void;
};
type PanelFormProps<T> = {
  editing: T | null;
  specialties: Especialidad[];
  onSave: (values: object) => Promise<void>;
  onCancel: () => void;
};
type ResourcePanelProps<T extends { id: number }> = {
  token: string;
  endpoint: string;
  title: string;
  description: string;
  specialties: Especialidad[];
  getActive: (item: T) => boolean;
  renderTable: (items: T[], actions: ItemActions<T>) => ReactNode;
  renderForm: (props: PanelFormProps<T>) => ReactNode;
};

type MainSection = 'clientes' | 'tecnicos' | 'catalogos';
type CatalogSection = 'especialidades' | 'categorias' | 'prioridades';

const fieldClass =
  'mt-1 h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring';
const labelClass = 'block text-sm font-medium text-foreground';
const mutedClass = 'text-sm text-muted-foreground';

function messageFrom(error: unknown) {
  return error instanceof ApiRequestError ? error.message : 'Ocurrió un error al comunicarse con la API.';
}

function Status({ active }: { active: boolean }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${active ? 'bg-green-100 text-green-800' : 'bg-muted text-muted-foreground'}`}>
      {active ? 'Activo' : 'Inactivo'}
    </span>
  );
}

function ResourcePanel<T extends { id: number }>({
  token,
  endpoint,
  title,
  description,
  specialties,
  getActive,
  renderTable,
  renderForm,
}: ResourcePanelProps<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [editing, setEditing] = useState<T | null>(null);
  const [page, setPage] = useState(1);
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (query) params.set('q', query);
      if (activeFilter) params.set('activo', activeFilter);
      const result = await apiRequest<ApiList<T>>(`${endpoint}?${params.toString()}`);
      setItems(result.data);
      setTotal(result.meta.total);
    } catch (requestError) {
      setError(messageFrom(requestError));
    } finally {
      setLoading(false);
    }
  }, [activeFilter, endpoint, page, query]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    queueMicrotask(() => {
      if (active) void load();
    });
    return () => { active = false; };
  }, [load, token]);

  async function save(values: object) {
    setSaving(true);
    setError('');
    try {
      const path = editing ? `${endpoint}/${editing.id}` : endpoint;
      const response = await apiRequest<{ data?: { passwordTemporal?: string; usuario?: { passwordTemporal?: string } } }>(path, {
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify(values),
      });
      setEditing(null);
      const passwordTemporal = response.data?.passwordTemporal ?? response.data?.usuario?.passwordTemporal;
      setNotice(passwordTemporal
        ? `Cuenta creada. Entrega esta contraseña temporal ahora; no volverá a mostrarse: ${passwordTemporal}`
        : editing ? 'Cambios guardados.' : 'Registro creado.');
      await load();
    } catch (requestError) {
      setError(messageFrom(requestError));
      throw requestError;
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(item: T) {
    setError('');
    setNotice('');
    try {
      await apiRequest(`${endpoint}/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ activo: !getActive(item) }),
      });
      setNotice(getActive(item) ? 'Registro inactivado.' : 'Registro activado.');
      await load();
    } catch (requestError) {
      setError(messageFrom(requestError));
    }
  }

  async function deleteItem(item: T) {
    if (!window.confirm('¿Eliminar físicamente este registro? Esta acción no se puede deshacer.')) return;
    setError('');
    setNotice('');
    try {
      await apiRequest(`${endpoint}/${item.id}`, { method: 'DELETE' });
      setNotice('Registro eliminado.');
      if (editing?.id === item.id) setEditing(null);
      await load();
    } catch (requestError) {
      setError(messageFrom(requestError));
    }
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setQuery(queryInput.trim());
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
          <Button type="button" variant="outline" onClick={() => setEditing(null)}>
            Nuevo registro
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {!token && <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">Conecta con un token JWT para consultar y administrar este recurso.</p>}
        {error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
        {notice && <p role="status" className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">{notice}</p>}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,0.8fr)]">
          <div className="min-w-0">
            <form onSubmit={submitSearch} className="mb-4 flex flex-wrap gap-2">
              <label className="sr-only" htmlFor={`${endpoint}-search`}>Buscar</label>
              <input
                id={`${endpoint}-search`}
                className={`${fieldClass} mt-0 min-w-48 flex-1`}
                value={queryInput}
                onChange={(event) => setQueryInput(event.target.value)}
                placeholder="Buscar por nombre..."
              />
              <label className="sr-only" htmlFor={`${endpoint}-active`}>Filtrar por vigencia</label>
              <select
                id={`${endpoint}-active`}
                className={`${fieldClass} mt-0 w-auto min-w-32`}
                value={activeFilter}
                onChange={(event) => { setActiveFilter(event.target.value); setPage(1); }}
              >
                <option value="">Todos</option>
                <option value="true">Activos</option>
                <option value="false">Inactivos</option>
              </select>
              <Button type="submit" variant="secondary">Buscar</Button>
            </form>

            {!token ? (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Esperando conexión con la API.</p>
            ) : loading ? (
              <p className={mutedClass} role="status">Cargando registros...</p>
            ) : items.length === 0 ? (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No hay registros para mostrar.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[38rem] text-left text-sm">
                  {renderTable(items, {
                    onEdit: setEditing,
                    onToggle: (item) => { void toggleActive(item); },
                    onDelete: (item) => { void deleteItem(item); },
                  })}
                </table>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between gap-3">
              <span className={mutedClass}>{total} registro(s)</span>
              <div className="flex gap-2">
                <Button type="button" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Anterior</Button>
                <span className="self-center text-sm">Página {page}</span>
                <Button type="button" variant="outline" disabled={page * 10 >= total || loading} onClick={() => setPage((value) => value + 1)}>Siguiente</Button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-muted/30 p-4">
            <h3 className="mb-4 text-base font-semibold">{editing ? 'Editar registro' : 'Crear registro'}</h3>
            {renderForm({
              editing,
              specialties,
              onSave: save,
              onCancel: () => { setEditing(null); setError(''); },
            })}
            {saving && <p className="mt-3 text-sm text-muted-foreground" role="status">Guardando...</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ClienteForm({ editing, onSave, onCancel }: PanelFormProps<Cliente>) {
  const [sedes, setSedes] = useState(() => editing?.sedes.map(({ nombre, direccion }) => ({ nombre, direccion })) ?? [{ nombre: '', direccion: '' }]);
  const [formError, setFormError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');
    const form = new FormData(event.currentTarget);
    if (sedes.length === 0 || sedes.some((sede) => !sede.nombre.trim() || !sede.direccion.trim())) {
      setFormError('Agrega al menos una sede e indica su nombre y dirección.');
      return;
    }
    const values: Record<string, unknown> = {
      nombre: form.get('nombre'),
      email: form.get('email'),
      telefono: form.get('telefono') || null,
      razonSocial: form.get('razonSocial'),
      ruc: form.get('ruc'),
      sedes,
    };
    try { await onSave(values); } catch { /* The resource panel displays the API error. */ }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className={labelClass}>Nombre de contacto<input className={fieldClass} name="nombre" required maxLength={120} defaultValue={editing?.usuario.nombre ?? ''} /></label>
      <label className={labelClass}>Correo<input className={fieldClass} name="email" type="email" required maxLength={160} defaultValue={editing?.usuario.email ?? ''} /></label>
      <label className={labelClass}>Teléfono<input className={fieldClass} name="telefono" maxLength={20} defaultValue={editing?.usuario.telefono ?? ''} /></label>
      <label className={labelClass}>Razón social<input className={fieldClass} name="razonSocial" required maxLength={160} defaultValue={editing?.razonSocial ?? ''} /></label>
      <label className={labelClass}>RUC (13 dígitos)<input className={fieldClass} name="ruc" required pattern="[0-9]{13}" minLength={13} maxLength={13} defaultValue={editing?.ruc ?? ''} /></label>
      {!editing && <p className="text-xs text-muted-foreground">Se generará una contraseña temporal de un solo uso y se mostrará al guardar.</p>}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className={labelClass}>Sedes</span>
          <Button type="button" variant="outline" size="sm" onClick={() => setSedes((current) => [...current, { nombre: '', direccion: '' }])}>Agregar sede</Button>
        </div>
        {sedes.map((sede, index) => (
          <div className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2" key={`${index}-${sede.nombre}`}>
            <label className={labelClass}>Nombre<input className={fieldClass} required maxLength={120} value={sede.nombre} onChange={(event) => setSedes((current) => current.map((item, i) => i === index ? { ...item, nombre: event.target.value } : item))} /></label>
            <label className={labelClass}>Dirección<input className={fieldClass} required maxLength={200} value={sede.direccion} onChange={(event) => setSedes((current) => current.map((item, i) => i === index ? { ...item, direccion: event.target.value } : item))} /></label>
            {sedes.length > 1 && <Button className="sm:col-span-2 sm:justify-self-end" type="button" variant="ghost" size="sm" onClick={() => setSedes((current) => current.filter((_, i) => i !== index))}>Quitar sede</Button>}
          </div>
        ))}
      </div>
      {formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}
      <FormActions editing={!!editing} onCancel={onCancel} />
    </form>
  );
}

function TecnicoForm({ editing, specialties, onSave, onCancel }: PanelFormProps<Tecnico>) {
  const [selected, setSelected] = useState<number[]>(() => editing?.especialidades.map(({ especialidadId }) => especialidadId) ?? []);
  const [formError, setFormError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');
    if (!selected.length) { setFormError('Selecciona al menos una especialidad.'); return; }
    const form = new FormData(event.currentTarget);
    const values: Record<string, unknown> = {
      nombre: form.get('nombre'),
      email: form.get('email'),
      telefono: form.get('telefono') || null,
      disponible: form.get('disponible') === 'on',
      cargaMax: Number(form.get('cargaMax')),
      especialidadIds: selected,
    };
    try { await onSave(values); } catch { /* The resource panel displays the API error. */ }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className={labelClass}>Nombre<input className={fieldClass} name="nombre" required maxLength={120} defaultValue={editing?.usuario.nombre ?? ''} /></label>
      <label className={labelClass}>Correo<input className={fieldClass} name="email" type="email" required maxLength={160} defaultValue={editing?.usuario.email ?? ''} /></label>
      <label className={labelClass}>Teléfono<input className={fieldClass} name="telefono" maxLength={20} defaultValue={editing?.usuario.telefono ?? ''} /></label>
      <label className={labelClass}>Carga máxima<input className={fieldClass} name="cargaMax" type="number" min={1} max={20} required defaultValue={editing?.cargaMax ?? 5} /></label>
      {!editing && <p className="text-xs text-muted-foreground">Se generará una contraseña temporal de un solo uso y se mostrará al guardar.</p>}
      <label className="flex items-center gap-2 text-sm"><input name="disponible" type="checkbox" defaultChecked={editing?.disponible ?? true} />Disponible para asignaciones</label>
      <fieldset className="space-y-2">
        <legend className={labelClass}>Especialidades</legend>
        {specialties.length === 0 ? <p className={mutedClass}>No hay especialidades disponibles.</p> : specialties.filter((specialty) => specialty.activo || selected.includes(specialty.id)).map((specialty) => (
          <label className="flex items-center gap-2 text-sm" key={specialty.id}>
            <input type="checkbox" checked={selected.includes(specialty.id)} disabled={!specialty.activo && !selected.includes(specialty.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, specialty.id] : current.filter((id) => id !== specialty.id))} />
            {specialty.nombre}
            {!specialty.activo && <span className="text-xs text-muted-foreground">(inactiva; desmárcala para quitarla)</span>}
          </label>
        ))}
      </fieldset>
      {formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}
      <FormActions editing={!!editing} onCancel={onCancel} />
    </form>
  );
}

function CatalogForm({ editing, specialties, onSave, onCancel, kind }: PanelFormProps<Catalogo> & { kind: CatalogSection }) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values: Record<string, unknown> = { nombre: form.get('nombre') };
    if (kind === 'categorias') values.especialidadId = Number(form.get('especialidadId'));
    if (kind === 'prioridades') values.horasSla = Number(form.get('horasSla'));
    try { await onSave(values); } catch { /* The resource panel displays the API error. */ }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className={labelClass}>Nombre<input className={fieldClass} name="nombre" required maxLength={kind === 'prioridades' ? 20 : 80} defaultValue={editing?.nombre ?? ''} /></label>
      {kind === 'categorias' && (
        <label className={labelClass}>Especialidad requerida
          <select className={fieldClass} name="especialidadId" required defaultValue={editing?.especialidadId ?? ''}>
            <option value="" disabled>Selecciona una especialidad</option>
            {specialties.filter((specialty) => specialty.activo).map((specialty) => <option value={specialty.id} key={specialty.id}>{specialty.nombre}</option>)}
          </select>
        </label>
      )}
      {kind === 'prioridades' && <label className={labelClass}>Horas SLA<input className={fieldClass} name="horasSla" type="number" min={1} required defaultValue={editing?.horasSla ?? 24} /></label>}
      <FormActions editing={!!editing} onCancel={onCancel} />
    </form>
  );
}

function FormActions({ editing, onCancel }: { editing: boolean; onCancel: () => void }) {
  return (
    <div className="flex flex-wrap gap-2 pt-2">
      <Button type="submit">{editing ? 'Guardar cambios' : 'Crear'}</Button>
      {editing && <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>}
    </div>
  );
}

function ClienteTable(items: Cliente[], actions: ItemActions<Cliente>) {
  return (
    <>
      <thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="px-3 py-3">Cliente</th><th className="px-3 py-3">RUC</th><th className="px-3 py-3">Sedes</th><th className="px-3 py-3">Estado</th><th className="px-3 py-3">Acciones</th></tr></thead>
      <tbody className="divide-y">
        {items.map((item) => (
          <tr key={item.id}>
            <td className="px-3 py-3"><strong>{item.razonSocial}</strong><div className={mutedClass}>{item.usuario.nombre} · {item.usuario.email}</div></td>
            <td className="px-3 py-3">{item.ruc}</td><td className="px-3 py-3">{item.sedes.length}</td>
            <td className="px-3 py-3"><Status active={item.activo} /></td>
            <td className="px-3 py-3"><RowActions item={item} active={item.activo} actions={actions} /></td>
          </tr>
        ))}
      </tbody>
    </>
  );
}

function TecnicoTable(items: Tecnico[], actions: ItemActions<Tecnico>) {
  return (
    <>
      <thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="px-3 py-3">Técnico</th><th className="px-3 py-3">Especialidades</th><th className="px-3 py-3">Disponibilidad / carga máx.</th><th className="px-3 py-3">Estado</th><th className="px-3 py-3">Acciones</th></tr></thead>
      <tbody className="divide-y">
        {items.map((item) => (
          <tr key={item.id}>
            <td className="px-3 py-3"><strong>{item.usuario.nombre}</strong><div className={mutedClass}>{item.usuario.email}</div></td>
            <td className="px-3 py-3">{item.especialidades.map(({ especialidad }) => especialidad.nombre).join(', ') || '—'}</td>
            <td className="px-3 py-3">{item.disponible ? 'Disponible' : 'No disponible'} · {item.cargaMax}</td>
            <td className="px-3 py-3"><Status active={item.usuario.activo} /></td>
            <td className="px-3 py-3"><RowActions item={item} active={item.usuario.activo} actions={actions} /></td>
          </tr>
        ))}
      </tbody>
    </>
  );
}

function CatalogTable(items: Catalogo[], actions: ItemActions<Catalogo>, kind: CatalogSection) {
  return (
    <>
      <thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="px-3 py-3">Nombre</th>{kind === 'categorias' && <th className="px-3 py-3">Especialidad</th>}{kind === 'prioridades' && <th className="px-3 py-3">Horas SLA</th>}<th className="px-3 py-3">Estado</th><th className="px-3 py-3">Acciones</th></tr></thead>
      <tbody className="divide-y">
        {items.map((item) => (
          <tr key={item.id}>
            <td className="px-3 py-3">{item.nombre}</td>
            {kind === 'categorias' && <td className="px-3 py-3">{item.especialidad?.nombre ?? '—'}</td>}
            {kind === 'prioridades' && <td className="px-3 py-3">{item.horasSla}</td>}
            <td className="px-3 py-3"><Status active={item.activo} /></td>
            <td className="px-3 py-3"><RowActions item={item} active={item.activo} actions={actions} /></td>
          </tr>
        ))}
      </tbody>
    </>
  );
}

function RowActions<T extends { id: number }>({ item, active, actions }: { item: T; active: boolean; actions: ItemActions<T> }) {
  return (
    <div className="flex flex-wrap gap-1">
      <Button type="button" size="sm" variant="outline" onClick={() => actions.onEdit(item)}>Editar</Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => actions.onToggle(item)}>{active ? 'Inactivar' : 'Activar'}</Button>
      <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => actions.onDelete(item)}>Eliminar</Button>
    </div>
  );
}

export default function AdminPage() {
  const { token, user } = useAuth();
  const [section, setSection] = useState<MainSection>('clientes');
  const [catalogSection, setCatalogSection] = useState<CatalogSection>('especialidades');
  const [specialties, setSpecialties] = useState<Especialidad[]>([]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    const params = new URLSearchParams({ page: '1', limit: '100' });
    apiRequest<ApiList<Especialidad>>(`/especialidades?${params.toString()}`)
      .then((result) => { if (active) setSpecialties(result.data); })
      .catch(() => { if (active) setSpecialties([]); });
    return () => { active = false; };
  }, [token]);

  return (
    <main className="mx-auto min-h-screen max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Administración</p>
          <h1 className="mt-1 text-3xl font-semibold">ServiGest</h1>
          <p className="mt-1 font-medium">Clientes, técnicos y catálogos</p>
          <p className="mt-2 text-muted-foreground">Gestiona registros, especialidades y parámetros operativos.</p>
        </div>
      </header>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
          <div><h2 className="font-semibold">Sesión autenticada</h2><p className={mutedClass}>Conectado como {user?.nombre} ({user?.rol}). El token se envía automáticamente.</p></div>
        </CardContent>
      </Card>

      <nav className="flex flex-wrap gap-2" aria-label="Secciones de administración">
        {([['clientes', 'Clientes'], ['tecnicos', 'Técnicos'], ['catalogos', 'Catálogos']] as const).map(([key, label]) => (
          <Button key={key} type="button" variant={section === key ? 'default' : 'outline'} onClick={() => setSection(key)}>{label}</Button>
        ))}
      </nav>

      {section === 'clientes' && (
        <ResourcePanel<Cliente>
          token={token} endpoint="/clientes" title="Clientes" description="Cuentas, RUC y sedes registradas."
          specialties={specialties} getActive={(item) => item.activo} renderTable={ClienteTable}
          renderForm={(props) => <ClienteForm key={props.editing?.id ?? 'new-client'} {...props} />}
        />
      )}
      {section === 'tecnicos' && (
        <ResourcePanel<Tecnico>
          token={token} endpoint="/tecnicos" title="Técnicos" description="Especialidades, disponibilidad y carga máxima."
          specialties={specialties} getActive={(item) => item.usuario.activo} renderTable={TecnicoTable}
          renderForm={(props) => <TecnicoForm key={props.editing?.id ?? 'new-tech'} {...props} />}
        />
      )}
      {section === 'catalogos' && (
        <>
          <nav className="flex flex-wrap gap-2" aria-label="Catálogos">
            {([['especialidades', 'Especialidades'], ['categorias', 'Categorías'], ['prioridades', 'Parámetros SLA']] as const).map(([key, label]) => (
              <Button key={key} type="button" size="sm" variant={catalogSection === key ? 'secondary' : 'ghost'} onClick={() => setCatalogSection(key)}>{label}</Button>
            ))}
          </nav>
          <ResourcePanel<Catalogo>
            token={token}
            key={catalogSection}
            endpoint={`/${catalogSection}`}
            title={catalogSection === 'prioridades' ? 'Parámetros operativos' : catalogSection[0].toUpperCase() + catalogSection.slice(1)}
            description={catalogSection === 'categorias' ? 'Cada categoría pertenece a una especialidad.' : catalogSection === 'prioridades' ? 'Prioridades y horas objetivo de servicio (SLA).' : 'Especialidades disponibles para asignación.'}
            specialties={specialties} getActive={(item) => item.activo}
            renderTable={(items, actions) => CatalogTable(items, actions, catalogSection)}
            renderForm={(props) => <CatalogForm key={`${catalogSection}-${props.editing?.id ?? 'new'}`} {...props} kind={catalogSection} />}
          />
        </>
      )}
    </main>
  );
}
