// Contopia — VerifyPage
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { m } from 'framer-motion';
import VerificationStatus from '../../components/auth/VerificationStatus';
import RegisterForm from '../../components/auth/RegisterForm';
import useVerify from '../../hooks/useVerify';
import useRegister from '../../hooks/useRegister';
import useAuthStore from '../../stores/auth-store';

export default function VerifyPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const verify = useVerify();
  const registerMutation = useRegister();
  const user = useAuthStore((s) => s.user);
  const [showResendForm, setShowResendForm] = useState(false);

  useEffect(() => {
    if (token) {
      verify.mutate(token);
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (verify.isSuccess && verify.data) {
      const timer = setTimeout(() => {
        navigate('/welcome');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [verify.isSuccess, verify.data, navigate]);

  const handleResend = (formData) => {
    registerMutation.mutate(formData, {
      onSuccess: () => {
        setShowResendForm(false);
      },
    });
  };

  const status = verify.getStatus();

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 p-4">
            <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <VerificationStatus status={status} onResend={() => setShowResendForm(true)} />

          {showResendForm && (
      <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6"
            >
              <RegisterForm
                onSubmit={handleResend}
                isPending={registerMutation.isPending}
                serverError={registerMutation.error ? registerMutation.getErrorMessage(registerMutation.error) : null}
              />
            </m.div>
          )}
        </div>
      </m.div>
    </main>
  );
}