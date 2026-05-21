import { useQuery } from '@tanstack/react-query';
import apiClient from '../lib/api-client';

export default function useBookEditQuery(bookId) {
  return useQuery({
    queryKey: ['bookEdit', bookId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/v1/books/${bookId}/edit`);
      return data.data;
    },
    enabled: !!bookId,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });
}