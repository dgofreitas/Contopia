// Contopia — WelcomePage
import { motion } from 'framer-motion';
import { Button } from 'flowbite-react';
import { HiSparkles } from 'react-icons/hi';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/auth-store';

export default function WelcomePage() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const childName = user?.childFirstName || t('welcome.fallbackName', { defaultValue: 'amigo' });

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-teal-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md text-center"
      >
        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          >
            <HiSparkles className="w-16 h-16 text-amber-500 mx-auto" aria-hidden="true" />
          </motion.div>

          <motion.h1
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 10 }}
            className="text-2xl font-bold text-gray-800"
          >
            {t('welcome.title', { name: childName })}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="text-gray-600 text-lg"
          >
            {t('welcome.subtitle')}
          </motion.p>

          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
          >
            <Button
              onClick={() => navigate('/')}
              className="w-full bg-amber-500 hover:bg-amber-600 focus:ring-amber-300 text-white font-semibold text-lg py-2.5 rounded-xl transition-colors"
              size="xl"
              aria-label="Start exploring"
            >
              {t('welcome.start')}
            </Button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.3 }}
            className="text-xs text-gray-400 mt-4"
          >
            We respect your privacy — only the minimum data needed, always protected.
          </motion.p>
        </div>
      </motion.div>
    </main>
  );
}