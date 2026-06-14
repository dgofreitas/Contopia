// Contopia — ParentLoginPage
// Email + password login for parent accounts
// NFR-PRV-01: Separate from child login — uses parent-auth-store
import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Label, TextInput, Button, Spinner, Alert } from 'flowbite-react';
import { HiLockClosed, HiMail } from 'react-icons/hi';
import useParentAuthStore from '../../stores/parent-auth-store';
import parentApiClient from '../../lib/parent-api-client';

export default function ParentLoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setParentToken = useParentAuthStore((s) => s.setParentToken);
  const setParentRefreshToken = useParentAuthStore((s) => s.setParentRefreshToken);
  const setParentUser = useParentAuthStore((s) => s.setParentUser);
  const setParentSession = useParentAuthStore((s) => s.setParentSession);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { data } = await parentApiClient.post('/login', { email, password });
      const result = data.data;

      setParentToken(result.accessToken);
      if (result.refreshToken) {
        setParentRefreshToken(result.refreshToken);
      }
      setParentUser({
        parentId: result.parentId,
        email: result.email,
        childId: result.childId,
        childFirstName: result.childFirstName,
      });
      setParentSession({
        parentSessionCreatedAt: Date.now(),
        parentLastActivity: Date.now(),
      });

      const returnTo = searchParams.get('returnTo') || '/parent/dashboard';
      navigate(returnTo, { replace: true });
    } catch (err) {
      const code = err?.response?.data?.error?.code;
      if (code === 'INVALID_CREDENTIALS') {
        setError('Invalid email or password. Please try again.');
      } else if (code === 'NOT_VERIFIED') {
        setError('Your account is not verified. Please check your email.');
      } else if (err?.response?.status === 429 || code === 'RATE_LIMITED') {
        setError('Too many attempts. Please wait a moment and try again.');
      } else if (!err.response) {
        setError('Unable to connect. Please check your internet connection.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8 space-y-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <HiLockClosed className="w-6 h-6 text-slate-600" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-semibold text-slate-800">Parent Login</h1>
            <p className="mt-2 text-sm text-slate-500">
              Access your child&apos;s activity dashboard
            </p>
          </div>

          {searchParams.get('expired') === 'true' && (
            <Alert color="info" role="status" aria-live="polite">
              Your session expired due to inactivity. Please sign in again.
            </Alert>
          )}

          {error && (
            <Alert color="failure" role="alert" aria-live="assertive">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <Label htmlFor="parent-email" value="Email" className="text-slate-700 font-medium" />
              <TextInput
                id="parent-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                icon={HiMail}
                disabled={isLoading}
                aria-required="true"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="parent-password" value="Password" className="text-slate-700 font-medium" />
              <TextInput
                id="parent-password"
                type="password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                icon={HiLockClosed}
                disabled={isLoading}
                aria-required="true"
                className="mt-1"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading || !email || !password}
              className="w-full bg-slate-700 hover:bg-slate-800 text-white font-medium py-2.5 rounded-lg transition-colors"
              size="lg"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Spinner size="sm" />
                  Signing in...
                </div>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-slate-400">
            COPPA compliant · Parent access only
          </p>
        </div>

        <div className="mt-4 text-center">
          <Link
            to="/login"
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            ← Back to child login
          </Link>
        </div>
      </div>
    </main>
  );
}