import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from 'flowbite-react';
import { HiPlus } from 'react-icons/hi';
import BookshelfGridLayout from './BookshelfGridLayout';
import useBooksQuery from '../../hooks/useBooksQuery';

export default function ShelfPage() {
  const { t } = useTranslation('shelf');
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const { data } = useBooksQuery();
  const hasBooks = (data?.data ?? []).length > 0;

  const fadeUpProps = prefersReducedMotion
    ? { initial: {}, animate: {}, transition: {} }
    : {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5, ease: 'easeOut' },
      };

  return (
    <main className="min-h-screen flex flex-col items-center bg-gradient-to-br from-amber-50 to-teal-50 p-4">
      <motion.div {...fadeUpProps} className="w-full max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-800 text-center flex-1">
            {t('title')}
          </h1>
          {hasBooks && (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
              <Button
                onClick={() => navigate('/editor/new')}
                className="bg-amber-500 hover:bg-amber-600 focus:ring-amber-300 text-white font-semibold py-2 px-4 rounded-xl flex items-center gap-2 min-h-[44px] min-w-[44px]"
                aria-label={t('newBookButton')}
              >
                <HiPlus className="w-5 h-5" />
                {t('newBookButton')}
              </Button>
            </motion.div>
          )}
        </div>

        <BookshelfGridLayout />
      </motion.div>
    </main>
  );
}