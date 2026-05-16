// Contopia — ShelfPage (Estante)
// Main bookshelf page with grid rendering
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import BookshelfGridLayout from './BookshelfGridLayout';

export default function ShelfPage() {
  const { t } = useTranslation('shelf');

  return (
    <main className="min-h-screen flex flex-col items-center bg-gradient-to-br from-amber-50 to-teal-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-6xl"
      >
        <h1 className="text-3xl font-bold text-gray-800 text-center mb-6">
          {t('title')}
        </h1>

        <BookshelfGridLayout />
      </motion.div>
    </main>
  );
}
