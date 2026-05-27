import { useQuery } from '@tanstack/react-query';
import apiClient from '../lib/api-client';

export default function useChaptersQuery(bookId) {
  return useQuery({
    queryKey: ['chapters', bookId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/v1/reader/${bookId}/chapters`);
      return data;
    },
    enabled: !!bookId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}