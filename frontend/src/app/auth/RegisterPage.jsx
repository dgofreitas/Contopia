// Contopia — RegisterPage
import { useState } from 'react';
import { m } from 'framer-motion';
import { Alert } from 'flowbite-react';
import { HiMail } from 'react-icons/hi';
import RegisterForm from '../../components/auth/RegisterForm';
import useRegister from '../../hooks/useRegister';
import { useTranslation } from 'react-i18next';

export default function RegisterPage() {
  const { t } = useTranslation('auth');
  const { mutate, isPending, error, data, getErrorMessage } = useRegister();
  const [registered, setRegistered] = useState(false);

  const handleSubmit = (formData) => {
    mutate(formData, {
      onSuccess: (responseData) => {
        setRegistered(true);
      },
    });
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 p-4">
            <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
          <h1 className="text-2xl font-bold text-gray-800 text-center">
            {t('register.title')}
          </h1>

          {registered || (data && !error) ? (
      <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              <Alert
                color="success"
                icon={HiMail}
                className="rounded-xl"
                role="alert"
                aria-live="polite"
              >
                <span className="font-semibold">{t('register.success')}</span>
                <p className="mt-1 text-sm">{t('register.checkEmail')}</p>
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

        <p className="mt-6 text-center text-sm text-gray-500">
          COPPA compliant · We only collect what's needed
        </p>
      </m.div>
    </main>
  );
}