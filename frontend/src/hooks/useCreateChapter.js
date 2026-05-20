import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/api-client';

export default function useCreateChapter(bookId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ title, content } = {}) => {
      const payload = {};
      if (title) payload.title = title;
      if (content) payload.content = content;
      const { data } = await apiClient.post(`/v1/books/${bookId}/chapters`, payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters', bookId] });
    },
  });
}