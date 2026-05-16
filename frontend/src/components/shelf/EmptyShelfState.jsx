// Contopia — EmptyShelfState
// Shown when user has no published books
import { motion, useReducedMotion } from 'framer-motion';
import { Button } from 'flowbite-react';
import { HiBookOpen, HiPlus } from 'react-icons/hi';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export default function EmptyShelfState() {
  const { t } = useTranslation('shelf');
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

  const bounceAnimation = prefersReducedMotion
    ? {}
    : {
        animate: {
          y: [0, -8, 0],
        },
        transition: {
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      };

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center space-y-6 py-16"
    >
      <motion.div {...bounceAnimation}>
        <HiBookOpen className="w-20 h-20 text-amber-400" aria-hidden="true" />
      </motion.div>

      <h2 className="text-2xl font-bold text-gray-700">{t('emptyTitle')}</h2>

      <p className="text-gray-500 max-w-sm">{t('emptyHint')}</p>

      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
        <Button
          onClick={() => navigate('/editor/new')}
          className="bg-amber-500 hover:bg-amber-600 focus:ring-amber-300 text-white font-semibold py-3 px-6 rounded-xl flex items-center gap-2"
          aria-label={t('createBook')}
        >
          <HiPlus className="w-5 h-5" />
          {t('createBook')}
        </Button>
      </motion.div>
    </div>
  );
}
