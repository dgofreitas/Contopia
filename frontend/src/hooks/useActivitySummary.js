import { useQuery } from '@tanstack/react-query';
import parentApiClient from '../lib/parent-api-client';
import useParentAuthStore from '../stores/parent-auth-store';

export default function useActivitySummary() {
  const parentToken = useParentAuthStore((s) => s.parentToken);

  return useQuery({
    queryKey: ['parent-activity-summary'],
    queryFn: async () => {
      const { data } = await parentApiClient.get('/activity/summary');
      return data;
    },
    enabled: !!parentToken,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: true,
  });
}