import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/api-client';
import { sanitizeText } from '../lib/sanitize';

export default function useCreateBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ title, summary }) => {
      const payload = {
        title: sanitizeText(title),
        summary: summary ? sanitizeText(summary) : undefined,
      };
      const { data } = await apiClient.post('/v1/books', payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });
}