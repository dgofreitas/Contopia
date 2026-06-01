import { useState } from 'react';
import { m } from 'framer-motion';
import { useReducedMotion } from '../../lib/animation-engine/index.js';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from 'flowbite-react';
import { HiPlus, HiUpload } from 'react-icons/hi';
import BookshelfGridLayout from './BookshelfGridLayout';
import SortButton from '../../components/shelf/SortButton';
import useBooksQuery from '../../hooks/useBooksQuery';
import ImportBookModal from '../../components/import/ImportBookModal';

export default function ShelfPage() {
  const { t } = useTranslation('shelf');
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const [searchParams] = useSearchParams();
  const highlightBookId = searchParams.get('highlight');
  const { data } = useBooksQuery();
  const hasBooks = (data?.data ?? []).length > 0;
  const [importOpen, setImportOpen] = useState(false);

  const fadeUpProps = prefersReducedMotion
    ? { initial: {}, animate: {}, transition: {} }
    : {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5, ease: 'easeOut' },
      };

  return (
    <main className="min-h-screen flex flex-col items-center bg-gradient-to-br from-amber-50 to-teal-50 p-4">
      <m.div {...fadeUpProps} className="w-full max-w-6xl">
        <div className="flex flex-wrap items-center justify-between mb-6 gap-3">
          <h1 className="text-3xl font-bold text-gray-800 text-center flex-1">
            {t('title')}
          </h1>
          <div className="flex items-center gap-3">
            <SortButton />
            {hasBooks && (
              <>
                <m.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    onClick={() => setImportOpen(true)}
                    className="bg-teal-500 hover:bg-teal-600 focus:ring-teal-300 text-white font-semibold py-2 px-4 rounded-xl flex items-center gap-2 min-h-[44px] min-w-[44px]"
                    aria-label={t('importBookButton')}
                  >
                    <HiUpload className="w-5 h-5" />
                    {t('importBookButton')}
                  </Button>
                </m.div>
                <m.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                  <Button
                  onClick={() => navigate('/editor/new')}
                  className="bg-amber-500 hover:bg-amber-600 focus:ring-amber-300 text-white font-semibold py-2 px-4 rounded-xl flex items-center gap-2 min-h-[44px] min-w-[44px]"
                  aria-label={t('newBookButton')}
                >
                  <HiPlus className="w-5 h-5" />
                  {t('newBookButton')}
                  </Button>
                </m.div>
              </>
            )}
          </div>
        </div>

        <BookshelfGridLayout highlightBookId={highlightBookId} />
      </m.div>

      <ImportBookModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        format="pdf"
      />
    </main>
  );
}