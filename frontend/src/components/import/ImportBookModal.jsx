import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button } from 'flowbite-react';
import { motion, useReducedMotion } from 'framer-motion';
import { HiUpload, HiX } from 'react-icons/hi';
import useImportBook from '../../hooks/useImportBook';

const MAX_FILE_SIZE = 25 * 1024 * 1024;

const ERROR_CODE_MAP = {
  INVALID_FILE_TYPE: 'import.unsupportedType',
  PAYLOAD_TOO_LARGE: 'import.fileTooBig',
  UPLOAD_FAILED: 'import.uploadFailed',
  NO_FILE: 'import.noFile',
  SCANNED_PDF: 'import.scannedPdf',
  CORRUPT_PDF: 'import.corruptPdf',
};

const FORMAT_ACCEPT = {
  txt: '.txt,text/plain',
  pdf: '.pdf,application/pdf',
};

const FORMAT_MIME = {
  txt: 'text/plain',
  pdf: 'application/pdf',
};

export default function ImportBookModal({ isOpen, onClose, format = 'txt' }) {
  const { t } = useTranslation('import');
  const reducedMotion = useReducedMotion();
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [clientError, setClientError] = useState(null);

  const { mutate, isPending, progress, error, reset } = useImportBook(format);

  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setClientError(null);
      reset();
    }
  }, [isOpen, reset]);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setClientError(null);

    const allowedMime = FORMAT_MIME[format] || 'text/plain';
    if (file.type !== allowedMime) {
      setClientError('import.unsupportedType');
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setClientError('import.fileTooBig');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  }, []);

  const handleImport = useCallback(() => {
    if (!selectedFile) {
      setClientError('import.noFile');
      return;
    }
    mutate(
      { file: selectedFile },
      {
        onSuccess: () => {
          setTimeout(() => onClose(), 1500);
        },
      },
    );
  }, [selectedFile, mutate, onClose]);

  const handleError = useCallback(() => {
    onClose();
  }, [onClose]);

  const displayError = clientError || (error ? ERROR_CODE_MAP[error.message] || 'import.uploadFailed' : null);
  const isSuccess = progress === 100 && !error && !clientError;

  if (!isOpen) return null;

  return (
    <Modal
      show={isOpen}
      onClose={handleError}
      size="md"
      popup
      aria-labelledby="import-book-title"
    >
      <Modal.Header />
      <Modal.Body>
        <div className="text-center">
          <HiUpload className="mx-auto mb-4 h-14 w-14 text-amber-400" />
          <h3 id="import-book-title" className="mb-2 text-lg font-semibold text-gray-800">
            {t('title')}
          </h3>

          {!isPending && !isSuccess && (
            <>
              <p className="mb-4 text-sm text-gray-600">{t('selectFile')}</p>
              <input
                ref={fileInputRef}
                type="file"
                accept={FORMAT_ACCEPT[format] || '.txt,text/plain'}
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100 mb-4"
                aria-label={t('selectFile')}
              />
              {displayError && (
                <p className="mb-4 text-sm text-red-600" role="alert" aria-live="polite">
                  {t(displayError)}
                </p>
              )}
              <div className="flex gap-3 justify-center">
                <Button
                  color="light"
                  onClick={handleError}
                  className="flex-1"
                >
                  <HiX className="mr-2 h-4 w-4" />
                  {t('button') === 'Importar um Livro' ? 'Cancelar' : 'Cancel'}
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={!selectedFile}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 focus:ring-amber-300 text-white font-semibold"
                >
                  {t(format === 'pdf' ? 'buttonPdf' : 'buttonTxt')}
                </Button>
              </div>
            </>
          )}

          {(isPending || isSuccess) && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-gray-700" aria-live="polite">
                {isSuccess ? t('success') : (progress >= 100 ? t('processing') : t('uploading'))}
              </p>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={t('progress', { percent: progress })}>
                {reducedMotion ? (
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                ) : (
                  <motion.div
                    className="h-full bg-amber-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  />
                )}
              </div>
              {progress > 0 && (
                <p className="text-xs text-gray-500" aria-live="polite">
                  {t('progress', { percent: progress })}
                </p>
              )}
            </div>
          )}
        </div>
      </Modal.Body>
    </Modal>
  );
}