import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiRequestError, apiRequest, readApiToken, saveApiToken } from '@/api/admin';

export type UserRole = 'admin' | 'coordinador' | 'tecnico' | 'cliente';
export type AuthUser = {
  id: number;
  nombre: string;
  email: string;
  telefono: string | null;
  rol: UserRole;
  activo: boolean;
  debeCambiarPassword: boolean;
  clienteId?: number | null;
};

export type AuthSession = { token: string; usuario: AuthUser };

type AuthContextValue = {
  token: string;
  user: AuthUser | null;
  loading: boolean;
  initializationError: string;
  login: (email: string, password: string) => Promise<AuthUser>;
  establishSession: (session: AuthSession) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<AuthUser>;
  setUser: (user: AuthUser) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(readApiToken);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(Boolean(readApiToken()));
  const [initializationError, setInitializationError] = useState('');

  const establishSession = useCallback((session: AuthSession) => {
    saveApiToken(session.token);
    setToken(session.token);
    setUser(session.usuario);
    setInitializationError('');
  }, []);

  useEffect(() => {
    if (!token) return;
    let active = true;
    queueMicrotask(() => {
      apiRequest<{ data: AuthUser }>('/auth/me')
        .then((response) => {
          if (active) {
            setUser(response.data);
            setInitializationError('');
          }
        })
        .catch((error: unknown) => {
          if (!active) return;
          if (error instanceof ApiRequestError && ['NO_AUTENTICADO', 'TOKEN_INVALIDO', 'CUENTA_INACTIVA'].includes(error.code ?? '')) {
            saveApiToken('');
            setToken('');
            setUser(null);
            setInitializationError('');
            setLoading(false);
          } else {
            setInitializationError(error instanceof Error ? error.message : 'No se pudo validar la sesión.');
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    });
    return () => { active = false; };
  }, [token]);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setInitializationError('');
    try {
      const response = await apiRequest<{ data: AuthSession }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      establishSession(response.data);
      return response.data.usuario;
    } finally {
      setLoading(false);
    }
  }, [establishSession]);

  const logout = useCallback(async () => {
    try {
      if (token) await apiRequest('/auth/logout', { method: 'POST' });
    } finally {
      saveApiToken('');
      setToken('');
      setUser(null);
      setInitializationError('');
      setLoading(false);
    }
  }, [token]);

  const refreshUser = useCallback(async () => {
    const response = await apiRequest<{ data: AuthUser }>('/auth/me');
    setUser(response.data);
    return response.data;
  }, []);

  const value = useMemo(() => ({
    token, user, loading, initializationError, login, establishSession, logout, refreshUser, setUser,
  }), [token, user, loading, initializationError, login, establishSession, logout, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}
