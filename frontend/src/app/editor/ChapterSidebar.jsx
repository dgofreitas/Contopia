import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { motion, AnimatePresence } from 'framer-motion';
import { HiChevronLeft, HiChevronRight, HiMenuAlt2 } from 'react-icons/hi';
import ChapterListItem from './ChapterListItem';
import AddChapterButton from './AddChapterButton';
import useReorderChapters from '../../hooks/useReorderChapters';

const MAX_CHAPTERS = 50;

export default function ChapterSidebar({
  bookId,
  chapters = [],
  activeChapterId,
  onSelectChapter,
  onAddChapter,
  onRenameChapter,
  onDeleteChapter,
  isCreatingChapter,
}) {
  const { t } = useTranslation('editor');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const reorderMutation = useReorderChapters(bookId);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = chapters.findIndex((c) => c._id === active.id);
      const newIndex = chapters.findIndex((c) => c._id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = [...chapters];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);

      const payload = reordered.map((c, i) => ({ id: c._id, order: i }));
      reorderMutation.mutate(payload);
    },
    [chapters, reorderMutation]
  );

  const handleMoveUp = useCallback(
    (chapterId) => {
      const index = chapters.findIndex((c) => c._id === chapterId);
      if (index <= 0) return;
      const reordered = [...chapters];
      [reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]];
      const payload = reordered.map((c, i) => ({ id: c._id, order: i }));
      reorderMutation.mutate(payload);
    },
    [chapters, reorderMutation]
  );

  const handleMoveDown = useCallback(
    (chapterId) => {
      const index = chapters.findIndex((c) => c._id === chapterId);
      if (index === -1 || index >= chapters.length - 1) return;
      const reordered = [...chapters];
      [reordered[index], reordered[index + 1]] = [reordered[index + 1], reordered[index]];
      const payload = reordered.map((c, i) => ({ id: c._id, order: i }));
      reorderMutation.mutate(payload);
    },
    [chapters, reorderMutation]
  );

  const sortedChapters = [...(chapters || [])].sort((a, b) => a.order - b.order);

  const chapterList = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {t('chapterNav')}
        </h2>
        {isCollapsed ? (
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            aria-label={t('chapterNav')}
          >
            <HiChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            aria-label={t('chapterNav')}
          >
            <HiChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {sortedChapters.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis]}
        >
          <SortableContext
            items={sortedChapters.map((c) => c._id)}
            strategy={verticalListSortingStrategy}
          >
            <ul role="list" className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
              {sortedChapters.map((chapter, index) => (
                <ChapterListItem
                  key={chapter._id}
                  chapter={chapter}
                  isActive={chapter._id === activeChapterId}
                  onSelect={onSelectChapter}
                  onRename={onRenameChapter}
                  onDelete={onDeleteChapter}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                  position={index}
                  totalCount={sortedChapters.length}
                  onCreateReplacement={onAddChapter}
                  isFirstChapter={index === 0}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {sortedChapters.length === 0 && (
        <div className="flex-1 flex items-center justify-center px-4">
          <p className="text-xs text-gray-400 text-center">{t('addChapter')}</p>
        </div>
      )}

      <div className="px-2 py-2 border-t border-gray-200">
        <AddChapterButton
          chaptersCount={chapters.length}
          onAdd={onAddChapter}
          isCreating={isCreatingChapter}
        />
      </div>
    </div>
  );

  return (
    <>
      {/* Screen reader live region for reorder announcements */}
      <div aria-live="polite" className="sr-only" id="chapter-reorder-announce" />

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-white border-r border-gray-200 transition-all duration-200 ${
          isCollapsed ? 'w-12' : 'w-60'
        }`}
        aria-label={t('chapterNav')}
      >
        {isCollapsed ? (
          <div className="flex flex-col items-center py-3 gap-2">
            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label={t('chapterNav')}
            >
              <HiMenuAlt2 className="w-5 h-5" />
            </button>
            <span className="text-[10px] text-gray-400 font-medium writing-mode-vertical"
                  style={{ writingMode: 'vertical-rl' }}>
              {t('chapterNav')}
            </span>
          </div>
        ) : (
          chapterList
        )}
      </aside>

      {/* Mobile bottom drawer */}
      <div className="lg:hidden">
        {/* Toggle button */}
        <button
          type="button"
          onClick={() => setIsMobileOpen(true)}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 bg-white shadow-lg rounded-full px-4 py-2 flex items-center gap-2 text-gray-600 hover:text-gray-800 border border-gray-200"
          aria-label={t('chapterNav')}
        >
          <HiMenuAlt2 className="w-5 h-5" />
          <span className="text-sm font-medium">{t('chapterNav')}</span>
        </button>

        <AnimatePresence>
          {isMobileOpen && (
            <>
              {/* Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileOpen(false)}
                className="fixed inset-0 z-40 bg-black/30"
                aria-hidden="true"
              />

              {/* Drawer */}
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl"
                style={{ maxHeight: '40vh' }}
                role="dialog"
                aria-label={t('chapterNav')}
              >
                <div className="flex items-center justify-center py-2">
                  <div className="w-10 h-1 rounded-full bg-gray-300" />
                </div>
                <div className="overflow-y-auto" style={{ maxHeight: 'calc(40vh - 24px)' }}>
                  {chapterList}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}