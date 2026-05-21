import { useQuery } from '@tanstack/react-query';
import apiClient from '../lib/api-client';

export default function useDraftsQuery() {
  return useQuery({
    queryKey: ['books', { status: 'draft' }],
    queryFn: async () => {
      const { data } = await apiClient.get('/v1/books', {
        params: { status: 'draft' },
      });
      return data;
    },
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });
}