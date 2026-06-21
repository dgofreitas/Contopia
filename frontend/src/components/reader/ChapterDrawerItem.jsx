import { useTranslation } from 'react-i18next';
import { FaCheckCircle, FaMinusCircle, FaRegCircle } from 'react-icons/fa';

const STATUS_ICONS = {
  read: FaCheckCircle,
  'in-progress': FaMinusCircle,
  unread: FaRegCircle,
};

export default function ChapterDrawerItem({ chapter, status, onClick, isCurrent }) {
  const { t } = useTranslation('reader');
  const Icon = STATUS_ICONS[status] || FaRegCircle;

  const statusLabel = {
    read: t('chapterRead'),
    'in-progress': t('chapterInProgress'),
    unread: t('chapterUnread'),
  };

  const ariaLabel = t('chapterAriaLabel', {
    number: chapter.order + 1,
    title: chapter.title,
    status: statusLabel[status],
  }) + (isCurrent ? `, ${t('currentChapter')}` : '');

  return (
    <li
      role="option"
      aria-selected={isCurrent}
      tabIndex={0}
      onClick={() => onClick(chapter)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(chapter);
        }
      }}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors ${
        isCurrent
          ? 'bg-amber-100 text-amber-900 font-semibold'
          : 'hover:bg-gray-100 text-gray-700'
      }`}
      aria-label={ariaLabel}
    >
      <Icon
        className={`w-5 h-5 flex-shrink-0 ${
          status === 'read'
            ? 'text-green-600'
            : status === 'in-progress'
            ? 'text-amber-500'
            : 'text-gray-300'
        }`}
        aria-hidden="true"
      />
      <span className="truncate">{chapter.title}</span>
    </li>
  );
}