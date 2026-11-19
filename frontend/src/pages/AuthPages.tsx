import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiRequestError, apiRequest } from '@/api/admin';
import { useAuth, type AuthSession } from '@/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const fieldClass = 'mt-1 h-10 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring';
const labelClass = 'block text-sm font-medium';

function AuthCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="text-md font-semibold">{title}</h1>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </main>
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiRequestError && error.code === 'CREDENCIALES_INVALIDAS') {
    return 'Correo o contraseña incorrectos.';
  }
  if (error instanceof ApiRequestError && error.code === 'CONFIGURACION_COMPLETADA') {
    return 'La configuración inicial ya fue completada. Inicia sesión con tu cuenta.';
  }
  return error instanceof Error ? error.message : 'No se pudo completar la solicitud.';
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [setupRequired, setSetupRequired] = useState(false);
  const [setupStatusError, setSetupStatusError] = useState('');
  const notice = typeof location.state?.notice === 'string' ? location.state.notice : '';

  useEffect(() => {
    let active = true;
    apiRequest<{ data: { setupRequired: boolean } }>('/auth/setup-status')
      .then(({ data }) => {
        if (active) setSetupRequired(data.setupRequired);
      })
      .catch(() => {
        if (active) setSetupStatusError('No se pudo consultar la configuración inicial. Comprueba que la API esté disponible.');
      });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      const user = await login(String(form.get('email')), String(form.get('password')));
      const destination = user.debeCambiarPassword ? '/primer-acceso' : location.state?.from?.pathname || '/inicio';
      navigate(destination, { replace: true });
    } catch (loginError) {
      setError(getErrorMessage(loginError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Iniciar sesión" description="Ingresa con tu cuenta de ServiGest.">
      <form className="space-y-4" onSubmit={submit}>
        {notice && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{notice}</p>}
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <label className={labelClass}>Correo electrónico<input className={fieldClass} name="email" type="email" autoComplete="username" required maxLength={160} /></label>
        <label className={labelClass}>Contraseña<input className={fieldClass} name="password" type="password" autoComplete="current-password" required /></label>
        <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Validando...' : 'Entrar'}</Button>
        <Link className="block text-center text-sm text-primary hover:underline" to="/recuperar">Olvidé mi contraseña</Link>
        {setupRequired && <Link className="block text-center text-sm text-primary hover:underline" to="/configurar">Primera vez: crear administrador inicial</Link>}
        {setupStatusError && <p role="status" className="text-center text-sm text-muted-foreground">{setupStatusError}</p>}
      </form>
    </AuthCard>
  );
}

export function InitialSetupPage() {
  const { establishSession } = useAuth();
  const navigate = useNavigate();
  const [setupRequired, setSetupRequired] = useState<boolean | null>(null);
  const [statusError, setStatusError] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiRequest<{ data: { setupRequired: boolean } }>('/auth/setup-status')
      .then(({ data }) => {
        if (active) setSetupRequired(data.setupRequired);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setStatusError(requestError instanceof Error ? requestError.message : 'No se pudo consultar la configuración inicial.');
      });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password'));
    if (password !== String(form.get('confirmPassword'))) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setBusy(true);
    try {
      const response = await apiRequest<{ data: AuthSession }>('/auth/setup', {
        method: 'POST',
        body: JSON.stringify({
          nombre: form.get('nombre'),
          email: form.get('email'),
          password,
        }),
      });
      // El backend devuelve la sesión junto con el alta para evitar pedir otro inicio de sesión.
      establishSession(response.data);
      navigate('/inicio', { replace: true });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  if (statusError) {
    return <AuthCard title="No se pudo iniciar la configuración" description="Comprueba que el backend esté disponible.">
      <p role="alert" className="mb-4 text-sm text-red-800">{statusError}</p>
      <Link className="block text-center text-sm text-primary hover:underline" to="/login">Volver al inicio de sesión</Link>
    </AuthCard>;
  }
  if (setupRequired === false) return <Navigate to="/login" replace />;
  if (setupRequired === null) {
    return <AuthCard title="Configuración inicial" description="Comprobando si aún no existe un administrador...">
      <p role="status" className="text-sm text-muted-foreground">Un momento...</p>
    </AuthCard>;
  }

  return (
    <AuthCard title="Crear administrador inicial" description="Esta opción solo está disponible mientras no exista una cuenta administradora.">
      <form className="space-y-4" onSubmit={submit}>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <label className={labelClass}>Nombre<input className={fieldClass} name="nombre" autoComplete="name" required maxLength={120} /></label>
        <label className={labelClass}>Correo electrónico<input className={fieldClass} name="email" type="email" autoComplete="email" required maxLength={160} /></label>
        <label className={labelClass}>Contraseña<input className={fieldClass} name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} pattern="(?=.*[A-Za-z])(?=.*\d).{8,72}" required /></label>
        <label className={labelClass}>Confirmar contraseña<input className={fieldClass} name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={72} required /></label>
        <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Creando cuenta...' : 'Crear y entrar'}</Button>
        <Link className="block text-center text-sm text-primary hover:underline" to="/login">Volver al inicio de sesión</Link>
      </form>
    </AuthCard>
  );
}

export function ForgotPasswordPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      await apiRequest('/auth/forgot', { method: 'POST', body: JSON.stringify({ email: form.get('email') }) });
      setSent(true);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Recuperar contraseña" description="Te indicaremos cómo continuar si la cuenta está registrada.">
      {sent ? (
        <div className="space-y-4">
          <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">Si el correo está registrado, recibirás instrucciones para recuperar el acceso.</p>
          <p className="text-sm text-muted-foreground">En desarrollo, el enlace se imprime en la consola del backend.</p>
          <Link className="block text-center text-sm text-primary hover:underline" to="/login">Volver a iniciar sesión</Link>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={submit}>
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          <label className={labelClass}>Correo electrónico<input className={fieldClass} name="email" type="email" autoComplete="email" required maxLength={160} /></label>
          <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Enviando...' : 'Solicitar enlace'}</Button>
          <Link className="block text-center text-sm text-primary hover:underline" to="/login">Volver a iniciar sesión</Link>
        </form>
      )}
    </AuthCard>
  );
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get('newPassword'));
    if (newPassword !== String(form.get('confirmPassword'))) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setBusy(true);
    try {
      await apiRequest('/auth/reset', { method: 'POST', body: JSON.stringify({ token, newPassword }) });
      navigate('/login', { replace: true, state: { notice: 'Contraseña actualizada. Ya puedes iniciar sesión.' } });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Crear contraseña nueva" description="Usa al menos 8 caracteres, una letra y un número.">
      {!token ? (
        <p role="alert" className="text-sm text-red-800">El enlace no incluye un token válido.</p>
      ) : (
        <form className="space-y-4" onSubmit={submit}>
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          <label className={labelClass}>Nueva contraseña<input className={fieldClass} name="newPassword" type="password" minLength={8} maxLength={72} pattern="(?=.*[A-Za-z])(?=.*\d).{8,72}" autoComplete="new-password" required /></label>
          <label className={labelClass}>Confirmar contraseña<input className={fieldClass} name="confirmPassword" type="password" minLength={8} maxLength={72} autoComplete="new-password" required /></label>
          <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Guardando...' : 'Guardar contraseña'}</Button>
        </form>
      )}
    </AuthCard>
  );
}

export function PasswordChangePage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!user?.debeCambiarPassword) return <Navigate to="/inicio" replace />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get('newPassword'));
    if (newPassword !== String(form.get('confirmPassword'))) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setBusy(true);
    try {
      const response = await apiRequest<{ data: typeof user }>('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ newPassword }),
      });
      if (response.data) setUser(response.data);
      navigate('/inicio', { replace: true });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Completa tu primer acceso" description={`Hola, ${user?.nombre ?? 'usuario'}. Crea una contraseña personal para continuar.`}>
      <form className="space-y-4" onSubmit={submit}>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <label className={labelClass}>Nueva contraseña<input className={fieldClass} name="newPassword" type="password" minLength={8} maxLength={72} pattern="(?=.*[A-Za-z])(?=.*\d).{8,72}" autoComplete="new-password" required /></label>
        <label className={labelClass}>Confirmar contraseña<input className={fieldClass} name="confirmPassword" type="password" minLength={8} maxLength={72} autoComplete="new-password" required /></label>
        <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Guardando...' : 'Guardar y entrar'}</Button>
      </form>
    </AuthCard>
  );
}

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    const form = new FormData(event.currentTarget);
    const currentPassword = String(form.get('currentPassword') ?? '');
    const newPassword = String(form.get('newPassword') ?? '');
    const values: Record<string, string | null> = {
      nombre: String(form.get('nombre')),
      telefono: String(form.get('telefono') ?? '') || null,
    };
    if (newPassword) {
      values.currentPassword = currentPassword;
      values.newPassword = newPassword;
    }
    if (newPassword && newPassword !== String(form.get('confirmPassword'))) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setBusy(true);
    try {
      await apiRequest('/auth/me', { method: 'PATCH', body: JSON.stringify(values) });
      await refreshUser();
      setNotice('Perfil actualizado.');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Mi perfil</CardTitle><CardDescription>Actualiza tus datos. El rol solo puede cambiarlo un administrador.</CardDescription></CardHeader>
      <CardContent>
        <form className="max-w-xl space-y-4" onSubmit={submit}>
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          {notice && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
          <label className={labelClass}>Nombre<input className={fieldClass} name="nombre" required maxLength={120} defaultValue={user?.nombre ?? ''} /></label>
          <label className={labelClass}>Correo<input className={`${fieldClass} opacity-70`} value={user?.email ?? ''} readOnly /></label>
          <label className={labelClass}>Teléfono<input className={fieldClass} name="telefono" maxLength={20} defaultValue={user?.telefono ?? ''} /></label>
          <hr />
          <p className="text-sm font-medium">Cambiar contraseña (opcional)</p>
          <label className={labelClass}>Contraseña actual<input className={fieldClass} name="currentPassword" type="password" autoComplete="current-password" /></label>
          <label className={labelClass}>Nueva contraseña<input className={fieldClass} name="newPassword" type="password" minLength={8} maxLength={72} pattern="(?=.*[A-Za-z])(?=.*\d).{8,72}" autoComplete="new-password" /></label>
          <label className={labelClass}>Confirmar nueva contraseña<input className={fieldClass} name="confirmPassword" type="password" autoComplete="new-password" /></label>
          <Button type="submit" disabled={busy}>{busy ? 'Guardando...' : 'Guardar cambios'}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
