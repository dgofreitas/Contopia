import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import apiClient from '../lib/api-client';

function useDebounce(fn, delay) {
  const timerRef = useRef(null);
  return useCallback((...args) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
}

export default function useUpdateReadingProgress(bookId) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (progressData) => {
      const { data } = await apiClient.put(`/v1/books/${bookId}/progress`, progressData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['readingProgress', bookId] });
    },
  });

  const debouncedMutate = useDebounce(mutation.mutate, 1000);

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    debouncedMutate,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}