import { Link } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const roles: Record<string, string> = {
  admin: 'administrador',
  coordinador: 'coordinador',
  tecnico: 'técnico',
  cliente: 'cliente',
};

export default function HomePage() {
  const { user } = useAuth();
  const canManage = user?.rol === 'admin' || user?.rol === 'coordinador';
  return (
    <>
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Inicio</p>
        <h1 className="mt-1 text-3xl font-semibold">Hola, {user?.nombre}</h1>
        <p className="mt-2 text-muted-foreground">Has iniciado sesión como {roles[user?.rol ?? ''] ?? user?.rol}.</p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Tu cuenta está protegida</CardTitle>
          <CardDescription>Accede a las funciones permitidas para tu rol y mantén tu perfil actualizado.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild variant="outline"><Link to="/perfil">Revisar mi perfil</Link></Button>
          {canManage && <Button asChild><Link to="/admin">Abrir administración</Link></Button>}
          {user?.rol === 'admin' && <Button asChild variant="secondary"><Link to="/admin/usuarios">Gestionar usuarios</Link></Button>}
        </CardContent>
      </Card>
    </>
  );
}
