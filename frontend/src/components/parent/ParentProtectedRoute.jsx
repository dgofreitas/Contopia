// Contopia — Parent Protected Route Component
// NFR-PRV-01: Checks parent-auth-store parentToken ONLY (not child token)
// STORY-062: Redirects to /parent (unified auth flow) with returnTo query param
// STORY-064 (G5/G6): Validating state with Spinner. When parentToken exists but
// parentUser is null (page refresh / bookmark), call GET /me to restore the user
// and proactively validate the token. The 401 interceptor handles refresh
// failures. On final failure the interceptor clears the token and this route
// redirects to /parent. No token → redirect /parent?returnTo=...
import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spinner } from 'flowbite-react';
import useParentAuthStore from '../../stores/parent-auth-store';
import parentApiClient from '../../lib/parent-api-client';

export default function ParentProtectedRoute({ children }) {
  const parentToken = useParentAuthStore((s) => s.parentToken);
  const parentUser = useParentAuthStore((s) => s.parentUser);
  const setParentUser = useParentAuthStore((s) => s.setParentUser);
  const location = useLocation();
  // Only validate when we have a token but no user yet (post-refresh/bookmark).
  const [validating, setValidating] = useState(parentToken ? !parentUser : false);

  useEffect(() => {
    if (!parentToken || parentUser) {
      setValidating(false);
      return undefined;
    }
    let cancelled = false;
    setValidating(true);
    parentApiClient
      .get('/me')
      .then(({ data }) => {
        if (cancelled) return;
        setParentUser(data.data);
      })
      .catch(() => {
        if (cancelled) return;
        // Token invalid → the 401 interceptor handles refresh + clearAll.
        // If the token was cleared by the refresh flow, stop validating; the
        // missing parentToken will trigger the redirect below.
        if (!useParentAuthStore.getState().parentToken) setValidating(false);
      })
      .finally(() => {
        if (!cancelled) setValidating(false);
      });
    return () => {
      cancelled = true;
    };
  }, [parentToken, parentUser, setParentUser]);

  if (!parentToken) {
    const returnTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/parent?returnTo=${returnTo}`} replace />;
  }

  if (validating) return <Spinner aria-label="Validating session" />;

  return children;
}