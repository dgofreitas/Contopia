// Contopia — RegisterPage
// STORY-057: Direct parent registration (email + password + ageConsent)
// On success → redirect to /parent/dashboard
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { m } from 'framer-motion';
import { Alert } from 'flowbite-react';
import { HiCheckCircle, HiLockClosed } from 'react-icons/hi';
import RegisterForm from '../../components/auth/RegisterForm';
import useRegister from '../../hooks/useRegister';
import useParentAuthStore from '../../stores/parent-auth-store';
import { useTranslation } from 'react-i18next';

export default function RegisterPage() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const { mutate, isPending, error, data, getErrorMessage } = useRegister();
  const parentToken = useParentAuthStore((s) => s.parentToken);
  const [registered, setRegistered] = useState(false);

  const handleSubmit = (formData) => {
    mutate(formData, {
      onSuccess: () => {
        setRegistered(true);
        // Navigate to parent dashboard after brief delay for state hydration
        setTimeout(() => {
          navigate('/parent/dashboard', { replace: true });
        }, 1500);
      },
    });
  };

  // Also check store token in case of race condition
  const isRegistered = registered || (data && !error) || !!parentToken;

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8 space-y-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <HiLockClosed className="w-6 h-6 text-slate-600" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-semibold text-slate-800">
              {t('register.title')}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {t('register.subtitle')}
            </p>
          </div>

          {isRegistered ? (
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              <Alert
                color="success"
                icon={HiCheckCircle}
                className="rounded-xl"
                role="alert"
                aria-live="polite"
              >
                <span className="font-semibold">{t('register.registrationSuccess')}</span>
                <p className="mt-1 text-sm">{t('register.redirecting')}</p>
              </Alert>
            </m.div>
          ) : (
            <>
              {error && (
                <Alert color="failure" role="alert" aria-live="polite">
                  {getErrorMessage(error)}
                </Alert>
              )}
              <RegisterForm
                onSubmit={handleSubmit}
                isPending={isPending}
                serverError={null}
              />
            </>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-slate-400">
          COPPA compliant · We only collect what's needed
        </p>
      </m.div>
    </main>
  );
}