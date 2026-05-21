import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { HiPencilAlt, HiDocumentText } from 'react-icons/hi';
import useDraftsQuery from '../../hooks/useDraftsQuery';

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function DraftSkeleton() {
  return (
    <li className="animate-pulse bg-white rounded-xl p-4 shadow">
      <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
      <div className="h-3 bg-gray-100 rounded w-1/2 mb-2" />
      <div className="h-3 bg-gray-100 rounded w-1/3" />
    </li>
  );
}

export default function DraftsListPage() {
  const { t } = useTranslation('shelf');
  const navigate = useNavigate();
  const { data, isLoading, error } = useDraftsQuery();

  const drafts = data?.data ?? [];

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-teal-50 p-4">
        <div className="text-center">
          <p className="text-red-500 font-semibold">{t('errorTitle')}</p>
          <p className="text-gray-500 text-sm mt-2">{t('errorMessage')}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center bg-gradient-to-br from-amber-50 to-teal-50 p-4">
      <div className="w-full max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <HiDocumentText className="w-8 h-8 text-amber-500" aria-hidden="true" />
          <h1 className="text-3xl font-bold text-gray-800">{t('draftsTitle')}</h1>
        </div>

        {isLoading && (
          <ul className="space-y-3" role="list" aria-label={t('draftsTitle')}>
            {[1, 2, 3].map((i) => (
              <DraftSkeleton key={i} />
            ))}
          </ul>
        )}

        {!isLoading && drafts.length === 0 && (
          <div className="text-center py-12">
            <HiDocumentText className="w-16 h-16 text-gray-300 mx-auto mb-4" aria-hidden="true" />
            <p className="text-gray-500 text-lg">{t('emptyDraftsMessage')}</p>
          </div>
        )}

        {!isLoading && drafts.length > 0 && (
          <ul className="space-y-3" role="list" aria-label={t('draftsTitle')}>
            {drafts.map((draft) => (
              <li key={draft._id}>
                <button
                  type="button"
                  onClick={() => navigate(`/editor/${draft._id}`)}
                  className="w-full text-left bg-white rounded-xl p-4 shadow hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-amber-300 min-h-[44px]"
                >
                  <div className="flex items-center gap-3">
                    <HiPencilAlt className="w-5 h-5 text-amber-500 flex-shrink-0" aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <h2 className="text-base font-semibold text-gray-800 truncate">
                        {draft.title || t('chapterTitlePlaceholder', { number: 1 })}
                      </h2>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        {draft.updatedAt && (
                          <span>{t('lastEdited', { date: formatDate(draft.updatedAt) })}</span>
                        )}
                        {draft.totalWordCount != null && (
                          <span>{t('wordCount', { count: draft.totalWordCount })}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}