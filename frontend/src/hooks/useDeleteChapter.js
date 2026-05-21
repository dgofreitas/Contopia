import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/api-client';

export default function useDeleteChapter(bookId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ chapterId }) => {
      await apiClient.delete(`/v1/books/${bookId}/chapters/${chapterId}`);
      return chapterId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters', bookId] });
      queryClient.invalidateQueries({ queryKey: ['bookEdit', bookId] });
    },
  });
}