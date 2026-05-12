// Contopia — ShelfPage (Estante)
// Placeholder: child-friendly bookshelf with large CTAs
import { motion } from 'framer-motion';
import { Button } from 'flowbite-react';
import { HiBookOpen, HiPlus } from 'react-icons/hi';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export default function ShelfPage() {
  const { t } = useTranslation('shelf');
  const navigate = useNavigate();

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-teal-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-lg text-center"
      >
        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          >
            <HiBookOpen className="w-16 h-16 text-amber-500 mx-auto" aria-hidden="true" />
          </motion.div>

          <h1 className="text-3xl font-bold text-gray-800">
            {t('title')}
          </h1>

          <p className="text-gray-600 text-lg">
            {t('subtitle')}
          </p>

          {/* Empty-state: no books yet */}
          <div className="space-y-4 pt-2">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
              <Button
                onClick={() => navigate('/editor/new')}
                className="w-full bg-amber-500 hover:bg-amber-600 focus:ring-amber-300 text-white font-semibold text-xl py-4 rounded-xl transition-colors flex items-center justify-center gap-3"
                size="xl"
                aria-label={t('createBook')}
              >
                <HiPlus className="w-6 h-6" />
                {t('createBook')}
              </Button>
            </motion.div>

            <p className="text-sm text-gray-400">
              {t('emptyHint')}
            </p>
          </div>
        </div>
      </motion.div>
    </main>
  );
}