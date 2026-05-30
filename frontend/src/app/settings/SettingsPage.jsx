// Contopia — SettingsPage
// Placeholder with logout button
import { m } from 'framer-motion';
import { Button, Spinner } from 'flowbite-react';
import { HiCog, HiLogout } from 'react-icons/hi';
import { useTranslation } from 'react-i18next';
import useLogout from '../../hooks/useLogout';

export default function SettingsPage() {
  const { t } = useTranslation();
  const { mutate: logout, isPending } = useLogout();

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-teal-50 p-4">
        <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6 text-center">
      <m.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          >
            <HiCog className="w-12 h-12 text-amber-500 mx-auto mb-4" aria-hidden="true" />
          </m.div>

          <h1 className="text-2xl font-bold text-gray-800">
            {t('settings.title')}
          </h1>

          <Button
            onClick={() => logout()}
            disabled={isPending}
            color="light"
            className="w-full border border-red-200 text-red-600 hover:bg-red-50 focus:ring-red-300 font-semibold text-lg py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
            size="xl"
            aria-label={t('logout.button')}
            style={{ minHeight: '48px' }}
          >
            {isPending ? <Spinner size="sm" className="mr-2" /> : <HiLogout className="w-5 h-5" />}
            {t('logout.button')}
          </Button>
        </div>
      </m.div>
    </main>
  );
}