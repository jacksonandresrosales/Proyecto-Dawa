import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/auth/AuthContext';
import Campana from '@/components/Campana';

const linkStyle = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-3 py-2 text-sm font-medium ${isActive ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent'}`;

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const canManage = user?.rol === 'admin' || user?.rol === 'coordinador';

  async function signOut() {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      navigate('/login', {
        replace: true,
        state: { notice: 'La sesión se cerró en este navegador, pero no se pudo confirmar con el servidor.' },
      });
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link className="text-lg font-semibold text-primary" to="/inicio">ServiGest</Link>
          <nav className="flex flex-wrap items-center gap-1" aria-label="Navegación principal">
            <NavLink className={linkStyle} to="/inicio">Inicio</NavLink>
            <NavLink className={linkStyle} to="/solicitudes">Solicitudes</NavLink>
            {canManage && <NavLink className={linkStyle} to="/admin">Clientes y catálogos</NavLink>}
            {user?.rol === 'admin' && <NavLink className={linkStyle} to="/admin/usuarios">Usuarios</NavLink>}
            <NavLink className={linkStyle} to="/perfil">Mi perfil</NavLink>
          </nav>
          <div className="flex items-center gap-3">
            <Campana />
            <span className="hidden text-sm text-muted-foreground sm:inline">{user?.nombre}</span>
            <Button type="button" variant="outline" onClick={() => { void signOut(); }}>Cerrar sesión</Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8"><Outlet /></main>
    </div>
  );
}
