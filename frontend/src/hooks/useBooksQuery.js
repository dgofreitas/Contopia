import { useQuery } from '@tanstack/react-query';
import apiClient from '../lib/api-client';
import useAuthStore from '../stores/auth-store';

export default function useBooksQuery({ status = 'published', page = 1, pageSize = 50 } = {}) {
  const token = useAuthStore((s) => s.token);

  return useQuery({
    queryKey: ['books', { status, page, pageSize }],
    queryFn: async () => {
      const { data } = await apiClient.get('/v1/books', {
        params: { status, page, pageSize },
      });
      return data;
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: true,
    placeholderData: (previousData) => previousData,
  });
}
