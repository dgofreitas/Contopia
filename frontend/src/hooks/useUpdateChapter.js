import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/api-client';

export default function useUpdateChapter(bookId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ chapterId, ...updates }) => {
      const { data } = await apiClient.put(`/v1/chapters/${chapterId}`, updates);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters', bookId] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });
}