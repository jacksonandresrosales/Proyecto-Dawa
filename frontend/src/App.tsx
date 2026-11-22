import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/auth/AuthContext';
import { PublicOnlyRoute, RequirePasswordChanged, RequireRoles, RequireUser } from '@/auth/ProtectedRoute';
import AppShell from '@/components/AppShell';
import AdminPage from '@/pages/AdminPage';
import { ForgotPasswordPage, InitialSetupPage, LoginPage, PasswordChangePage, ProfilePage, ResetPasswordPage } from '@/pages/AuthPages';
import HomePage from '@/pages/HomePage';
import UsuariosPage from '@/pages/UsuariosPage';
import NuevaSolicitudPage from '@/pages/NuevaSolicitudPage';
import SolicitudDetallePage from '@/pages/SolicitudDetallePage';
import SolicitudesPage from '@/pages/SolicitudesPage';

function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/configurar" element={<InitialSetupPage />} />
        <Route path="/recuperar" element={<ForgotPasswordPage />} />
        <Route path="/restablecer" element={<ResetPasswordPage />} />
      </Route>
      <Route element={<RequireUser />}>
        <Route path="/primer-acceso" element={<PasswordChangePage />} />
        <Route element={<RequirePasswordChanged />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<Navigate to="/inicio" replace />} />
            <Route path="/inicio" element={<HomePage />} />
            <Route path="/perfil" element={<ProfilePage />} />
            <Route path="/solicitudes" element={<SolicitudesPage />} />
            <Route path="/solicitudes/:id" element={<SolicitudDetallePage />} />
            <Route element={<RequireRoles roles={['coordinador', 'cliente']} />}>
              <Route path="/solicitudes/nueva" element={<NuevaSolicitudPage />} />
            </Route>
            <Route element={<RequireRoles roles={['admin', 'coordinador']} />}>
              <Route path="/admin" element={<AdminPage />} />
            </Route>
            <Route element={<RequireRoles roles={['admin']} />}>
              <Route path="/admin/usuarios" element={<UsuariosPage />} />
            </Route>
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
