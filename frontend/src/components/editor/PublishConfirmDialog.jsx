import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button } from 'flowbite-react';
import { HiSparkles, HiX } from 'react-icons/hi';

export default function PublishConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  isPublishing,
  bookTitle,
  errorCode,
}) {
  const { t } = useTranslation('editor');
  const cancelButtonRef = useRef(null);

  useEffect(() => {
    if (isOpen && cancelButtonRef.current) {
      cancelButtonRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  return (
    <Modal show={isOpen} onClose={onCancel} size="md" popup aria-labelledby="publish-confirm-title">
      <Modal.Header />
      <Modal.Body>
        <div className="text-center">
          <HiSparkles className="mx-auto mb-4 h-14 w-14 text-amber-400" />
          <h3 id="publish-confirm-title" className="mb-2 text-lg font-semibold text-gray-800">
            {t('publishConfirmTitle')}
          </h3>
          <p className="mb-4 text-sm text-gray-600">
            {t('publishConfirmMessage', { title: bookTitle })}
          </p>
          {errorCode === 'EMPTY_CONTENT' && (
            <p className="mb-4 text-sm text-amber-600 font-medium">
              {t('publishEmptyContent')}
            </p>
          )}
          {errorCode && errorCode !== 'EMPTY_CONTENT' && (
            <p className="mb-4 text-sm text-red-600">
              {t('publishError')}
            </p>
          )}
          <div className="flex gap-3 justify-center">
            <Button
              ref={cancelButtonRef}
              color="light"
              onClick={onCancel}
              disabled={isPublishing}
              className="flex-1"
            >
              <HiX className="mr-2 h-4 w-4" />
              {t('publishCancelButton')}
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isPublishing}
              className="flex-1 bg-amber-500 hover:bg-amber-600 focus:ring-amber-300 text-white font-semibold"
            >
              {isPublishing ? t('publishing') : t('publishConfirmButton')}
            </Button>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
}