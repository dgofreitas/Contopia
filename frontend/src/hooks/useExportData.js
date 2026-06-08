import { useMutation } from '@tanstack/react-query';
import parentApiClient from '../lib/parent-api-client';

export default function useExportData() {
  return useMutation({
    mutationFn: async () => {
      const response = await parentApiClient.get('/export', {
        responseType: 'blob',
      });

      const blob = response.data;
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'contopia-export.zip';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match && match[1]) {
          filename = match[1].replace(/['"]/g, '');
        }
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return { filename };
    },
  });
}