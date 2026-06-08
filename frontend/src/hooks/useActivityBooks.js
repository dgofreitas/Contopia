import { useQuery } from '@tanstack/react-query';
import parentApiClient from '../lib/parent-api-client';
import useParentAuthStore from '../stores/parent-auth-store';

export default function useActivityBooks({ limit = 20, offset = 0 } = {}) {
  const parentToken = useParentAuthStore((s) => s.parentToken);

  return useQuery({
    queryKey: ['parent-activity-books', { limit, offset }],
    queryFn: async () => {
      const { data } = await parentApiClient.get('/activity/books', {
        params: { limit, offset },
      });
      return data;
    },
    enabled: !!parentToken,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: true,
  });
}