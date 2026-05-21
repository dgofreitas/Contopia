import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/api-client';

export default function usePublishBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookId) => {
      const { data } = await apiClient.post(`/v1/books/${bookId}/publish`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });
}