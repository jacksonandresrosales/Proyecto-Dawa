import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, type UserRole } from './AuthContext';

function LoadingSession() {
  return <main className="p-8 text-center text-muted-foreground" role="status">Validando sesión...</main>;
}

export function RequireUser() {
  const { user, loading, initializationError } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingSession />;
  if (initializationError) {
    return <main className="mx-auto max-w-xl p-8 text-center" role="alert">{initializationError}</main>;
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

export function RequirePasswordChanged() {
  const { user } = useAuth();
  const location = useLocation();
  if (user?.debeCambiarPassword && location.pathname !== '/primer-acceso') {
    return <Navigate to="/primer-acceso" replace />;
  }
  return <Outlet />;
}

export function RequireRoles({ roles }: { roles: UserRole[] }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.rol)) {
    return <Navigate to="/inicio" replace />;
  }
  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSession />;
  if (user) return <Navigate to={user.debeCambiarPassword ? '/primer-acceso' : '/inicio'} replace />;
  return <Outlet />;
}
