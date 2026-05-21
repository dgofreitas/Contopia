import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/api-client';

export function useSaveTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ bookId, templateId }) => {
      const { data } = await apiClient.patch(`/v1/books/${bookId}`, { templateId });
      return data;
    },
    onSuccess: (_, { bookId }) => {
      queryClient.invalidateQueries({ queryKey: ['bookEdit', bookId] });
    },
  });
}