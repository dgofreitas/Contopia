import { useTranslation } from 'react-i18next';

export default function PublishedEditBadge({ book }) {
  const { t } = useTranslation('editor');

  if (!book || book.status !== 'published') return null;

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-amber-100 text-amber-800 border border-amber-300">
      <span className="w-2 h-2 rounded-full bg-amber-500" aria-hidden="true" />
      {t('publishedEditBadge')}
    </span>
  );
}