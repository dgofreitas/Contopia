import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HiTrash } from 'react-icons/hi';
import { HiBars2 } from 'react-icons/hi2';
import InlineEditTitle from './InlineEditTitle';
import ReorderButtons from './ReorderButtons';
import DeleteChapterDialog from './DeleteChapterDialog';

export default function ChapterListItem({
  chapter,
  isActive,
  onSelect,
  onRename,
  onDelete,
  onMoveUp,
  onMoveDown,
  position,
  totalCount,
  onCreateReplacement,
  isFirstChapter = false,
}) {
  const { t } = useTranslation('editor');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: chapter._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleRename = (newTitle) => {
    onRename({ chapterId: chapter._id, title: newTitle });
  };

  const handleConfirmDelete = () => {
    onDelete({ chapterId: chapter._id });
    setShowDeleteDialog(false);
  };

  const canMoveUp = position > 0;
  const canMoveDown = position < totalCount - 1;

  return (
    <>
      <li
        ref={setNodeRef}
        style={style}
        role="listitem"
        aria-label={`Chapter ${position + 1}: ${chapter.title}`}
        {...(isFirstChapter ? { 'data-chapter-list-item': 'true' } : {})}
        className={`group flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
          isActive
            ? 'bg-amber-100 border border-amber-300'
            : 'hover:bg-gray-50 border border-transparent'
        }`}
        onClick={() => onSelect(chapter._id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(chapter._id);
          }
        }}
        tabIndex={0}
      >
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing p-0.5 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-1 focus:ring-amber-300 rounded"
          aria-label={t('chapterReorder')}
          {...attributes}
          {...listeners}
        >
          <HiBars2 className="w-4 h-4" />
        </button>

        <div className="flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
          <InlineEditTitle
            title={chapter.title}
            onSave={handleRename}
            maxLength={200}
          />
        </div>

        <div
          className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <ReorderButtons
            canMoveUp={canMoveUp}
            canMoveDown={canMoveDown}
            onMoveUp={() => onMoveUp(chapter._id)}
            onMoveDown={() => onMoveDown(chapter._id)}
          />
          <button
            type="button"
            onClick={() => setShowDeleteDialog(true)}
            className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors focus:outline-none focus:ring-1 focus:ring-red-300"
            aria-label={t('chapterDelete')}
          >
            <HiTrash className="w-3.5 h-3.5" />
          </button>
        </div>
      </li>

      <DeleteChapterDialog
        isOpen={showDeleteDialog}
        chapterTitle={chapter.title}
        isLastChapter={totalCount === 1}
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteDialog(false)}
        onCreateReplacement={onCreateReplacement}
      />
    </>
  );
}