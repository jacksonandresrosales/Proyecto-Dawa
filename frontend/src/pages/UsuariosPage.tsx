import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ApiRequestError, apiRequest, type ApiList } from '@/api/admin';
import { useAuth, type UserRole } from '@/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type ManagedUser = {
  id: number;
  nombre: string;
  email: string;
  telefono: string | null;
  activo: boolean;
  debeCambiarPassword: boolean;
  rol: UserRole;
  perfil: 'cliente' | 'tecnico' | null;
};
type UserFormProps = { editing: ManagedUser | null; onSave: (values: object) => Promise<void>; onCancel: () => void };

const fieldClass = 'mt-1 h-10 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring';
const labelClass = 'block text-sm font-medium';

function errorMessage(error: unknown) {
  return error instanceof ApiRequestError ? error.message : 'No se pudo completar la solicitud.';
}

function UserForm({ editing, onSave, onCancel }: UserFormProps) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await onSave({
        nombre: form.get('nombre'),
        email: form.get('email'),
        telefono: form.get('telefono') || null,
        ...(editing?.perfil ? {} : { rol: form.get('rol') }),
      });
    } catch {
      // The parent displays the API error.
    }
  }

  return (
    <form className="space-y-3" onSubmit={submit}>
      <label className={labelClass}>Nombre<input className={fieldClass} name="nombre" required maxLength={120} defaultValue={editing?.nombre ?? ''} /></label>
      <label className={labelClass}>Correo<input className={fieldClass} name="email" type="email" required maxLength={160} defaultValue={editing?.email ?? ''} /></label>
      <label className={labelClass}>Teléfono<input className={fieldClass} name="telefono" maxLength={20} defaultValue={editing?.telefono ?? ''} /></label>
      <label className={labelClass}>Rol
        {editing?.perfil ? (
          <input className={`${fieldClass} opacity-70`} value={editing.rol} readOnly />
        ) : (
          <select className={fieldClass} name="rol" defaultValue={editing?.rol ?? 'coordinador'}>
            <option value="admin">Administrador</option>
            <option value="coordinador">Coordinador</option>
          </select>
        )}
      </label>
      {!editing && <p className="text-xs text-muted-foreground">Se generará una contraseña temporal de un solo uso. Cliente y Técnico se crean desde sus perfiles.</p>}
      <div className="flex gap-2 pt-2">
        <Button type="submit">{editing ? 'Guardar cambios' : 'Crear usuario'}</Button>
        {editing && <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>}
      </div>
    </form>
  );
}

export default function UsuariosPage() {
  const { user: actor } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [page, setPage] = useState(1);
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('');
  const [active, setActive] = useState('');
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (query) params.set('q', query);
      if (role) params.set('rol', role);
      if (active) params.set('activo', active);
      const response = await apiRequest<ApiList<ManagedUser>>(`/usuarios?${params.toString()}`);
      setUsers(response.data);
      setTotal(response.meta.total);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [active, page, query, role]);

  useEffect(() => {
    let activeEffect = true;
    queueMicrotask(() => { if (activeEffect) void load(); });
    return () => { activeEffect = false; };
  }, [load]);

  async function save(values: object) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const path = editing ? `/usuarios/${editing.id}` : '/usuarios';
      const response = await apiRequest<{ data: { usuario?: ManagedUser; passwordTemporal?: string } }>(path, {
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify(values),
      });
      setEditing(null);
      const temp = response.data.passwordTemporal;
      setNotice(temp
        ? `Cuenta creada. Entrega esta contraseña temporal ahora; no volverá a mostrarse: ${temp}`
        : 'Cambios guardados.');
      await load();
    } catch (requestError) {
      setError(errorMessage(requestError));
      throw requestError;
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(item: ManagedUser) {
    setError('');
    setNotice('');
    try {
      await apiRequest(`/usuarios/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ activo: !item.activo }),
      });
      setNotice(item.activo ? 'Usuario desactivado.' : 'Usuario activado.');
      await load();
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  }

  async function resetPassword(item: ManagedUser) {
    if (!window.confirm(`¿Generar una contraseña temporal nueva para ${item.email}?`)) return;
    setError('');
    setNotice('');
    try {
      const response = await apiRequest<{ data: { passwordTemporal: string } }>(
        `/usuarios/${item.id}/restablecer-password`,
        { method: 'POST' },
      );
      setNotice(`Contraseña temporal de ${item.email}; entrégala ahora, no volverá a mostrarse: ${response.data.passwordTemporal}`);
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  }

  async function deactivate(item: ManagedUser) {
    if (!window.confirm(`¿Desactivar la cuenta de ${item.email}?`)) return;
    setError('');
    setNotice('');
    try {
      await apiRequest(`/usuarios/${item.id}`, { method: 'DELETE' });
      setNotice('Cuenta desactivada.');
      if (editing?.id === item.id) setEditing(null);
      await load();
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  }

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setQuery(queryInput.trim());
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><CardTitle>Usuarios y roles</CardTitle><CardDescription className="mt-1">Administra cuentas, vigencia y contraseñas temporales.</CardDescription></div>
          <Button type="button" variant="outline" onClick={() => setEditing(null)}>Nuevo usuario</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {notice && <p role="status" className="break-all rounded-lg bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(19rem,0.7fr)]">
          <div className="min-w-0">
            <form onSubmit={search} className="mb-4 flex flex-wrap gap-2">
              <label className="sr-only" htmlFor="usuarios-search">Buscar usuarios</label>
              <input id="usuarios-search" className={`${fieldClass} mt-0 min-w-48 flex-1`} placeholder="Buscar por nombre o correo" value={queryInput} onChange={(event) => setQueryInput(event.target.value)} />
              <label className="sr-only" htmlFor="usuarios-role">Filtrar por rol</label>
              <select id="usuarios-role" className={`${fieldClass} mt-0 w-auto`} value={role} onChange={(event) => { setRole(event.target.value); setPage(1); }}>
                <option value="">Todos los roles</option>
                <option value="admin">Administrador</option><option value="coordinador">Coordinador</option>
                <option value="tecnico">Técnico</option><option value="cliente">Cliente</option>
              </select>
              <label className="sr-only" htmlFor="usuarios-active">Filtrar por estado</label>
              <select id="usuarios-active" className={`${fieldClass} mt-0 w-auto`} value={active} onChange={(event) => { setActive(event.target.value); setPage(1); }}>
                <option value="">Todos</option><option value="true">Activos</option><option value="false">Inactivos</option>
              </select>
              <Button type="submit" variant="secondary">Buscar</Button>
            </form>
            {loading ? <p role="status" className="text-sm text-muted-foreground">Cargando usuarios...</p> : users.length === 0 ? (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No hay usuarios para mostrar.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[46rem] text-left text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr><th className="px-3 py-3">Cuenta</th><th className="px-3 py-3">Rol / perfil</th><th className="px-3 py-3">Estado</th><th className="px-3 py-3">Acciones</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {users.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-3"><strong>{item.nombre}</strong><div className="text-muted-foreground">{item.email}</div></td>
                        <td className="px-3 py-3">{item.rol}{item.perfil && <div className="text-xs text-muted-foreground">Perfil vinculado: {item.perfil}</div>}{item.debeCambiarPassword && <div className="text-xs text-amber-700">Debe cambiar contraseña</div>}</td>
                        <td className="px-3 py-3"><span className={`rounded-full px-2.5 py-1 text-xs ${item.activo ? 'bg-green-100 text-green-800' : 'bg-muted text-muted-foreground'}`}>{item.activo ? 'Activo' : 'Inactivo'}</span></td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1">
                            <Button size="sm" type="button" variant="outline" onClick={() => setEditing(item)}>Editar</Button>
                            <Button size="sm" type="button" variant="ghost" onClick={() => { void resetPassword(item); }}>Restablecer clave</Button>
                            {item.id !== actor?.id && item.activo && <Button size="sm" type="button" variant="ghost" className="text-destructive" onClick={() => { void deactivate(item); }}>Desactivar</Button>}
                            {item.id !== actor?.id && !item.activo && <Button size="sm" type="button" variant="ghost" onClick={() => { void toggleActive(item); }}>Reactivar</Button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">{total} usuario(s)</span>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Anterior</Button>
                <span className="text-sm">Página {page}</span>
                <Button type="button" variant="outline" disabled={page * 10 >= total || loading} onClick={() => setPage((value) => value + 1)}>Siguiente</Button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-muted/30 p-4">
            <h2 className="mb-4 font-semibold">{editing ? 'Editar usuario' : 'Crear usuario'}</h2>
            <UserForm key={editing?.id ?? 'new-user'} editing={editing} onSave={save} onCancel={() => { setEditing(null); setError(''); }} />
            {busy && <p className="mt-3 text-sm text-muted-foreground" role="status">Guardando...</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
