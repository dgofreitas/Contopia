// Contopia — LoginPage
// Two-tab login: Password + Magic Link
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HiLockClosed } from 'react-icons/hi';
import LoginForm from '../../components/auth/LoginForm';
import useLogin from '../../hooks/useLogin';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { mutate, isPending, error, data, getErrorMessage } = useLogin();
  const [serverError, setServerError] = useState(null);

  const handleSubmit = (formData) => {
    setServerError(null);
    mutate(formData, {
      onSuccess: (responseData) => {
        // Password login: token issued → navigate
        if (responseData?.data?.accessToken) {
          const returnTo = searchParams.get('returnTo') || '/welcome';
          navigate(returnTo, { replace: true });
        }
        // Magic link: just show success notice (handled by LoginForm)
      },
      onError: (err) => {
        setServerError(getErrorMessage(err));
      },
    });
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="text-center"
          >
            <HiLockClosed className="w-12 h-12 text-amber-500 mx-auto mb-4" aria-hidden="true" />
          </motion.div>

          <h1 className="text-2xl font-bold text-gray-800 text-center">
            {t('login.title')}
          </h1>

          <LoginForm
            onSubmit={handleSubmit}
            isPending={isPending}
            serverError={serverError}
          />
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          COPPA compliant · We only collect what's needed
        </p>
      </motion.div>
    </main>
  );
}