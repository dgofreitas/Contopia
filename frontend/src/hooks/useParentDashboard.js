import { useQuery } from '@tanstack/react-query';
import parentApiClient from '../lib/parent-api-client';
import useParentAuthStore from '../stores/parent-auth-store';

export default function useParentDashboard() {
  const parentToken = useParentAuthStore((s) => s.parentToken);

  return useQuery({
    queryKey: ['parent-dashboard'],
    queryFn: async () => {
      const { data } = await parentApiClient.get('/dashboard');
      return data;
    },
    enabled: !!parentToken,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: true,
  });
}