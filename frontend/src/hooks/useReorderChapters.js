import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/api-client';

export default function useReorderChapters(bookId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (chapters) => {
      const { data } = await apiClient.patch(
        `/v1/books/${bookId}/chapters/reorder`,
        { chapters }
      );
      return data.data;
    },
    onMutate: async (newChapters) => {
      await queryClient.cancelQueries({ queryKey: ['chapters', bookId] });
      const previous = queryClient.getQueryData(['chapters', bookId]);

      queryClient.setQueryData(['chapters', bookId], (old) => {
        if (!old?.data) return old;
        const reordered = newChapters.map((nc) => {
          const oldChapter = old.data.find((c) => c._id === nc.id);
          return { ...oldChapter, order: nc.order };
        }).sort((a, b) => a.order - b.order);
        return { ...old, data: reordered };
      });

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['chapters', bookId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters', bookId] });
    },
  });
}