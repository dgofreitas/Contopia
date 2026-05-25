import { useTranslation } from 'react-i18next';
import { useCoverStore } from '../../stores/cover-store';
import { useUploadCoverImage } from '../../hooks/useUploadCoverImage';
import { validateImageFile } from '../../lib/image-upload-utils';
import UploadButton from './UploadButton';
import UploadProgress from './UploadProgress';
import ImagePreview from './ImagePreview';

export default function ImageUploadSection({ bookId }) {
  const { t } = useTranslation('cover');
  const coverImage = useCoverStore((s) => s.coverImage);
  const uploadProgress = useCoverStore((s) => s.uploadProgress);
  const coverUploadError = useCoverStore((s) => s.uploadError);
  const isUploading = useCoverStore((s) => s.isUploading);
  const clearCoverImage = useCoverStore((s) => s.clearCoverImage);
  const { uploadImage, cancelUpload, isUploading: isUploadInProgress } = useUploadCoverImage();

  async function handleFileSelect(file) {
    const validation = validateImageFile(file);
    if (!validation.valid) {
      useCoverStore.getState().setUploadError(validation.errorCode);
      return;
    }

    try {
      await uploadImage(bookId, file);
    } catch {
      // error handled by hook
    }
  }

  function handleRemove() {
    clearCoverImage();
  }

  function handleCancel() {
    cancelUpload();
  }

  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-700 mb-2">
        {t('cover.upload.sectionHeading')}
      </h2>

      <div className="flex flex-col gap-3">
        <UploadButton
          onFileSelect={handleFileSelect}
          disabled={isUploadInProgress}
        />

        {isUploading && (
          <UploadProgress
            progress={uploadProgress}
            onCancel={handleCancel}
          />
        )}

        {coverUploadError && !isUploading && (
          <p className="text-red-700 text-xs" role="alert">
            {t(`cover.upload.errors.${coverUploadError}`, t('cover.upload.errors.UPLOAD_FAILED'))}
          </p>
        )}

        {coverImage && (
          <ImagePreview
            thumbnailUrl={coverImage.thumbnailUrl}
            fullUrl={coverImage.fullUrl}
            onRemove={handleRemove}
          />
        )}
      </div>
    </section>
  );
}