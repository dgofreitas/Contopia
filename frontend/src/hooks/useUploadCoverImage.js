import { useRef, useState, useCallback } from 'react';
import { useCoverStore } from '../stores/cover-store';
import useAuthStore from '../stores/auth-store';

export function useUploadCoverImage() {
  const xhrRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  const setCoverImage = useCoverStore((s) => s.setCoverImage);
  const setUploadProgress = useCoverStore((s) => s.setUploadProgress);
  const storeSetUploadError = useCoverStore((s) => s.setUploadError);

  const uploadImage = useCallback((bookId, file) => {
    return new Promise((resolve, reject) => {
      setIsUploading(true);
      storeSetUploadError(null);
      setUploadProgress(0);

      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      const formData = new FormData();
      formData.append('file', file);

      const token = useAuthStore.getState().token;

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percent);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            const coverData = response.data;
            setCoverImage({
              assetId: coverData.assetId,
              thumbnailUrl: coverData.thumbnailUrl,
              fullUrl: coverData.fullUrl,
              dominantColor: coverData.dominantColor,
            });
            setUploadProgress(100);
            storeSetUploadError(null);
            setIsUploading(false);
            resolve(coverData);
          } catch {
            storeSetUploadError('PROCESSING_ERROR');
            setIsUploading(false);
            reject(new Error('Failed to parse upload response'));
          }
        } else {
          let errorDetail = 'Upload failed';
          try {
            const errResponse = JSON.parse(xhr.responseText);
            if (errResponse.error?.message) {
              errorDetail = errResponse.error.message;
            }
          } catch {
            // use default error message
          }
          storeSetUploadError('UPLOAD_FAILED');
          setIsUploading(false);
          reject(new Error(errorDetail));
        }
      });

      xhr.addEventListener('error', () => {
        storeSetUploadError('UPLOAD_FAILED');
        setIsUploading(false);
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('abort', () => {
        setIsUploading(false);
        reject(new Error('Upload cancelled'));
      });

      xhr.open('POST', `/api/v1/books/${bookId}/assets?type=cover`);
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      xhr.send(formData);
    });
  }, [setCoverImage, setUploadProgress, storeSetUploadError]);

  const cancelUpload = useCallback(() => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
    setIsUploading(false);
    setUploadProgress(0);
    storeSetUploadError(null);
  }, [setUploadProgress, storeSetUploadError]);

  return { uploadImage, cancelUpload, isUploading };
}