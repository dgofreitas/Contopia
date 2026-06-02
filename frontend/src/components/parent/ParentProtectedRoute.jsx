// Contopia — ParentProtectedRoute Component
// NFR-PRV-01: Checks parent-auth-store parentToken ONLY (not child token)
// Redirects to /parent/login with returnTo query param
import { Navigate, useLocation } from 'react-router-dom';
import useParentAuthStore from '../../stores/parent-auth-store';

export default function ParentProtectedRoute({ children }) {
  const parentToken = useParentAuthStore((s) => s.parentToken);
  const location = useLocation();

  if (!parentToken) {
    const returnTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/parent/login?returnTo=${returnTo}`} replace />;
  }

  return children;
}