import { useQuery } from '@tanstack/react-query';
import apiClient from '../lib/api-client';

export default function useReadingProgressQuery(bookId) {
  return useQuery({
    queryKey: ['readingProgress', bookId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/v1/books/${bookId}/progress`);
      return data;
    },
    enabled: !!bookId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}