import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

function getToken() {
  return localStorage.getItem('token');
}

export default function useImportBook(format = 'txt') {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState(0);

  const mutation = useMutation({
    mutationFn: ({ file }) => {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        formData.append('file', file);

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch {
              reject(new Error('UPLOAD_FAILED'));
            }
          } else {
            try {
              const err = JSON.parse(xhr.responseText);
              reject(new Error(err.error?.code || err.error?.message || 'UPLOAD_FAILED'));
            } catch {
              reject(new Error('UPLOAD_FAILED'));
            }
          }
        });

        xhr.addEventListener('error', () => reject(new Error('UPLOAD_FAILED')));

        xhr.open('POST', `/api/v1/import/${format}`);
        const token = getToken();
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
        xhr.send(formData);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    progress,
    error: mutation.error,
    reset: () => {
      setProgress(0);
      mutation.reset();
    },
  };
}