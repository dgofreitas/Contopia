import { useQuery } from '@tanstack/react-query';
import apiClient from '../lib/api-client';

export default function useAllReadingProgressQuery() {
  return useQuery({
    queryKey: ['readingProgress', 'all'],
    queryFn: async () => {
      const { data } = await apiClient.get('/v1/books/progress/all');
      return data;
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}