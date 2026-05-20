import { useTranslation } from 'react-i18next';
import { Modal, Button } from 'flowbite-react';
import { HiExclamationTriangle } from 'react-icons/hi2';
import { HiPlus } from 'react-icons/hi';

export default function DeleteChapterDialog({
  isOpen,
  chapterTitle,
  isLastChapter,
  onConfirm,
  onCancel,
  onCreateReplacement,
}) {
  const { t } = useTranslation('editor');

  return (
    <Modal show={isOpen} onClose={onCancel} size="md" popup aria-labelledby="delete-chapter-title">
      <Modal.Header />
      <Modal.Body>
        <div className="text-center">
          <HiExclamationTriangle className="mx-auto mb-4 h-14 w-14 text-amber-400" />
          <h3 id="delete-chapter-title" className="mb-2 text-lg font-semibold text-gray-800">
            {t('chapterDelete')}
          </h3>
          <p id="delete-chapter-warning" className="mb-4 text-sm text-gray-600">
            {isLastChapter
              ? t('chapterDeleteLastWarning')
              : t('chapterDeleteConfirm', { title: chapterTitle })}
          </p>
          {isLastChapter && onCreateReplacement && (
            <Button
              size="sm"
              color="light"
              onClick={onCreateReplacement}
              className="w-full mb-3 border border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              <HiPlus className="mr-2 h-4 w-4" />
              {t('addChapter')}
            </Button>
          )}
          <div className="flex gap-3 justify-center">
            <Button color="light" onClick={onCancel} className="flex-1">
              {t('createBook.cancel')}
            </Button>
            <Button color="failure" onClick={onConfirm} className="flex-1">
              {t('chapterDelete')}
            </Button>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
}