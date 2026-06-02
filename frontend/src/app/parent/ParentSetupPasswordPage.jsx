// Contopia — ParentSetupPasswordPage
// Initial password setup from token query param
// NFR-SEC-04: Strong password validation (min 8 chars, 1 uppercase, 1 number)
import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Label, TextInput, Button, Spinner, Alert } from 'flowbite-react';
import { HiLockClosed, HiCheckCircle } from 'react-icons/hi';
import parentApiClient from '../../lib/parent-api-client';

const PASSWORD_RULES = {
  minLength: 8,
  requireUppercase: true,
  requireNumber: true,
};

function validatePassword(password) {
  const errors = [];
  if (password.length < PASSWORD_RULES.minLength) {
    errors.push(`At least ${PASSWORD_RULES.minLength} characters`);
  }
  if (PASSWORD_RULES.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('At least 1 uppercase letter');
  }
  if (PASSWORD_RULES.requireNumber && !/[0-9]/.test(password)) {
    errors.push('At least 1 number');
  }
  return errors;
}

export default function ParentSetupPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState([]);
  const [confirmError, setConfirmError] = useState('');

  useEffect(() => {
    if (password) {
      setPasswordErrors(validatePassword(password));
    } else {
      setPasswordErrors([]);
    }
  }, [password]);

  useEffect(() => {
    if (confirmPassword && confirmPassword !== password) {
      setConfirmError('Passwords do not match');
    } else {
      setConfirmError('');
    }
  }, [confirmPassword, password]);

  // No token → invalid link
  if (!token) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8 space-y-4 text-center">
            <h1 className="text-xl font-semibold text-slate-800">Invalid Link</h1>
            <p className="text-slate-500">
              This password setup link is invalid or has expired. Please request a new one.
            </p>
            <Link
              to="/parent/login"
              className="inline-block text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              Go to parent login
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const errors = validatePassword(password);
    if (errors.length > 0) {
      setError('Please fix the password requirements below.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      await parentApiClient.post('/setup-password', { token, password });
      setSuccess(true);
    } catch (err) {
      const code = err?.response?.data?.error?.code;
      if (code === 'TOKEN_EXPIRED') {
        setError('This setup link has expired. Please request a new one.');
      } else if (code === 'TOKEN_INVALID') {
        setError('This setup link is invalid. Please request a new one.');
      } else if (!err.response) {
        setError('Unable to connect. Please check your internet connection.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8 space-y-4 text-center">
            <HiCheckCircle className="w-12 h-12 text-green-500 mx-auto" aria-hidden="true" />
            <h1 className="text-xl font-semibold text-slate-800">Password Set!</h1>
            <p className="text-slate-500">
              Your parent account password has been set. You can now log in.
            </p>
            <Link to="/parent/login">
              <Button
                className="bg-slate-700 hover:bg-slate-800 text-white font-medium rounded-lg"
                size="lg"
              >
                Go to Login
              </Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8 space-y-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <HiLockClosed className="w-6 h-6 text-slate-600" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-semibold text-slate-800">Set Your Password</h1>
            <p className="mt-2 text-sm text-slate-500">
              Create a password for your parent account
            </p>
          </div>

          {error && (
            <Alert color="failure" role="alert" aria-live="assertive">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <Label htmlFor="setup-password" value="Password" className="text-slate-700 font-medium" />
              <TextInput
                id="setup-password"
                type="password"
                placeholder="Min 8 chars, 1 uppercase, 1 number"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                icon={HiLockClosed}
                disabled={isLoading}
                aria-required="true"
                aria-invalid={passwordErrors.length > 0}
                aria-describedby="password-rules"
                className="mt-1"
              />
              {passwordErrors.length > 0 && (
                <ul id="password-rules" className="mt-2 space-y-1" role="list">
                  {passwordErrors.map((msg) => (
                    <li key={msg} className="text-sm text-red-500 flex items-center gap-1">
                      <span aria-hidden="true">✗</span> {msg}
                    </li>
                  ))}
                </ul>
              )}
              {password && passwordErrors.length === 0 && (
                <p className="mt-2 text-sm text-green-600 flex items-center gap-1">
                  <HiCheckCircle className="w-4 h-4" aria-hidden="true" /> Password meets requirements
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="setup-confirm-password" value="Confirm Password" className="text-slate-700 font-medium" />
              <TextInput
                id="setup-confirm-password"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                icon={HiLockClosed}
                disabled={isLoading}
                aria-required="true"
                aria-invalid={!!confirmError}
                className="mt-1"
                helperText={confirmError ? <span className="text-red-500">{confirmError}</span> : undefined}
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading || !password || !confirmPassword || passwordErrors.length > 0 || !!confirmError}
              className="w-full bg-slate-700 hover:bg-slate-800 text-white font-medium py-2.5 rounded-lg transition-colors"
              size="lg"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Spinner size="sm" />
                  Setting password...
                </div>
              ) : (
                'Set Password'
              )}
            </Button>
          </form>
        </div>

        <div className="mt-4 text-center">
          <Link
            to="/parent/login"
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            ← Back to parent login
          </Link>
        </div>
      </div>
    </main>
  );
}