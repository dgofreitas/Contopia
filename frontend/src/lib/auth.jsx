import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api, ApiError } from './api';

const AuthContext = createContext(null);

// Guarda quem está usando o site: { role, parent, child } ou null.
export function AuthProvider({ children }) {
  const [me, setMe] = useState(undefined);

  const refresh = useCallback(async () => {
    try {
      setMe(await api.get('/auth/me'));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setMe(null);
      else throw err;
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => setMe(null));
  }, [refresh]);

  const value = useMemo(
    () => ({
      me,
      setMe,
      refresh,
      logout: async () => {
        await api.post('/auth/logout');
        setMe(null);
      },
      setChild: (child) => setMe((current) => (current ? { ...current, child } : current)),
    }),
    [me, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

export function RequireParent({ children }) {
  const { me } = useAuth();
  if (me === undefined) return <Loading />;
  if (!me || me.role !== 'parent') return <Navigate to="/login" replace />;
  return children;
}

export function RequireChild({ children }) {
  const { me } = useAuth();
  if (me === undefined) return <Loading />;
  if (!me?.child) return <Navigate to={me?.role === 'parent' ? '/familia' : '/'} replace />;
  return children;
}

export function Loading() {
  return (
    <div className="loading" role="status">
      <span className="loading__book" aria-hidden="true">📖</span>
      Abrindo a estante...
    </div>
  );
}
