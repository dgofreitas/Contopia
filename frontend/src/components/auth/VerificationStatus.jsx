// Contopia — VerificationStatus Component
import { Button } from 'flowbite-react';
import { Spinner } from 'flowbite-react';
import { HiCheckCircle, HiExclamationCircle, HiXCircle } from 'react-icons/hi';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export default function VerificationStatus({ status, onResend }) {
  const { t } = useTranslation('auth');

  return (
    <div
      className="flex flex-col items-center gap-4 text-center p-8"
      aria-live="polite"
      role="status"
    >
      {status === 'verifying' && (
        <>
          <Spinner size="xl" className="text-amber-500" />
          <h2 className="text-xl font-semibold text-gray-800">{t('verify.title')}</h2>
        </>
      )}

      {status === 'success' && (
        <>
          <HiCheckCircle className="w-16 h-16 text-emerald-500" aria-hidden="true" />
          <h2 className="text-xl font-semibold text-gray-800">{t('verify.success')}</h2>
          <Link
            to="/welcome"
            className="mt-2 inline-block rounded-xl bg-amber-500 px-8 py-3 text-lg font-semibold text-white hover:bg-amber-600 focus:ring-4 focus:ring-amber-300 transition-colors"
            aria-label={t('welcome.start')}
          >
            {t('welcome.start')}
          </Link>
        </>
      )}

      {status === 'expired' && (
        <>
          <HiExclamationCircle className="w-16 h-16 text-amber-500" aria-hidden="true" />
          <h2 className="text-xl font-semibold text-gray-800">{t('verify.expired')}</h2>
          <Button
            onClick={onResend}
            className="mt-2 bg-amber-500 hover:bg-amber-600 focus:ring-amber-300 text-white font-semibold rounded-xl"
            size="xl"
            aria-label={t('verify.resend')}
          >
            {t('verify.resend')}
          </Button>
        </>
      )}

      {status === 'invalid' && (
        <>
          <HiXCircle className="w-16 h-16 text-red-500" aria-hidden="true" />
          <h2 className="text-xl font-semibold text-gray-800">{t('verify.invalid')}</h2>
          <p className="text-gray-600">{t('register.errorGeneric')}</p>
          <Link
            to="/"
            className="mt-2 inline-block rounded-xl bg-amber-500 px-8 py-3 text-lg font-semibold text-white hover:bg-amber-600 focus:ring-4 focus:ring-amber-300 transition-colors"
          >
            {t('register.submit')}
          </Link>
        </>
      )}

      {status === 'error' && (
        <>
          <HiXCircle className="w-16 h-16 text-red-500" aria-hidden="true" />
          <h2 className="text-xl font-semibold text-gray-800">{t('register.errorGeneric')}</h2>
        </>
      )}
    </div>
  );
}