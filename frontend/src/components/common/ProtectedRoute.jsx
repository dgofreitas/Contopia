// Contopia — ProtectedRoute Component
// Redirects unauthenticated users to /login with returnTo query param
import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../stores/auth-store';

export default function ProtectedRoute({ children }) {
  const token = useAuthStore((s) => s.token);
  const location = useLocation();

  if (!token) {
    const returnTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?returnTo=${returnTo}`} replace />;
  }

  return children;
}