import { useMutation, useQueryClient } from '@tanstack/react-query';
import parentApiClient from '../lib/parent-api-client';

export default function useDeleteAccount() {
  const queryClient = useQueryClient();

  const requestDeletion = useMutation({
    mutationFn: async ({ confirmText }) => {
      const { data } = await parentApiClient.post('/deletion-request', { confirmText });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parent-deletion-status'] });
    },
  });

  const cancelDeletion = useMutation({
    mutationFn: async ({ childId }) => {
      const { data } = await parentApiClient.post('/deletion-request/cancel', { childId });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parent-deletion-status'] });
    },
  });

  return { requestDeletion, cancelDeletion };
}