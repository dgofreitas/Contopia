// Contopia — usePrivacyPolicy hook
// TanStack Query hook for GET /privacy-policy via parentApiClient
import { useQuery } from '@tanstack/react-query';
import parentApiClient from '../lib/parent-api-client';
import useParentAuthStore from '../stores/parent-auth-store';

export default function usePrivacyPolicy() {
  const parentToken = useParentAuthStore((s) => s.parentToken);

  return useQuery({
    queryKey: ['parent-privacy-policy'],
    queryFn: async () => {
      const { data } = await parentApiClient.get('/privacy-policy');
      return data;
    },
    enabled: !!parentToken,
    staleTime: 30 * 60 * 1000, // 30 min — privacy content rarely changes
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: 1,
  });
}