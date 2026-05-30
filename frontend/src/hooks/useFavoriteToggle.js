import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/api-client';

export default function useFavoriteToggle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookId, isFavorited }) => {
      const { data } = await apiClient.patch(`/v1/books/${bookId}`, { isFavorited });
      return data;
    },
    onMutate: async ({ bookId, isFavorited }) => {
      await queryClient.cancelQueries({ queryKey: ['books'] });

      const previousBooks = queryClient.getQueryData(['books']);

      queryClient.setQueriesData({ queryKey: ['books'] }, (old) => {
        if (!old) return old;
        if (Array.isArray(old)) {
          return old.map((book) =>
            book._id === bookId ? { ...book, isFavorited } : book,
          );
        }
        if (old.data && Array.isArray(old.data)) {
          return {
            ...old,
            data: old.data.map((book) =>
              book._id === bookId ? { ...book, isFavorited } : book,
            ),
          };
        }
        if (old.pages) {
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              data: Array.isArray(page.data)
                ? page.data.map((book) =>
                    book._id === bookId ? { ...book, isFavorited } : book,
                  )
                : page.data,
            })),
          };
        }
        return old;
      });

      return { previousBooks };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousBooks) {
        queryClient.setQueriesData({ queryKey: ['books'] }, context.previousBooks);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });
}