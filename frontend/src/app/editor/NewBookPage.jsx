import { m } from 'framer-motion';
import { useReducedMotion } from '../../lib/animation-engine/index.js';
import { HiPencilAlt } from 'react-icons/hi';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import NewBookForm from '../../components/editor/NewBookForm';
import useCreateBook from '../../hooks/useCreateBook';

export default function NewBookPage() {
  const { t } = useTranslation('editor');
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const createBookMutation = useCreateBook();

  const handleSubmit = (data) => {
    createBookMutation.mutate(
      { title: data.title, summary: data.summary },
      {
        onSuccess: (book) => {
          navigate(`/editor/${book._id}`);
        },
      }
    );
  };

  const serverError = createBookMutation.error?.response?.data?.error?.message
    || (createBookMutation.error ? t('createBook.errorBookLimit') : null);

  const fadeUpProps = prefersReducedMotion
    ? { initial: {}, animate: {}, transition: {} }
    : {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5, ease: 'easeOut' },
      };

  const iconProps = prefersReducedMotion
    ? { initial: {}, animate: {}, transition: {} }
    : {
        initial: { scale: 0.8, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        transition: { delay: 0.2, type: 'spring', stiffness: 200 },
      };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-teal-50 p-4">
      <m.div {...fadeUpProps} className="w-full max-w-lg text-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
          <m.div {...iconProps}>
            <HiPencilAlt className="w-16 h-16 text-teal-500 mx-auto" aria-hidden="true" />
          </m.div>

          <h1 className="text-3xl font-bold text-gray-800">
            {t('createBook.title')}
          </h1>

          <p className="text-gray-600 text-lg">
            {t('createBook.subtitle')}
          </p>

          <div className="flex justify-center">
            <NewBookForm
              onSubmit={handleSubmit}
              isPending={createBookMutation.isPending}
              serverError={serverError}
            />
          </div>
        </div>
      </m.div>
    </main>
  );
}