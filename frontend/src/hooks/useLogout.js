// Contopia — useLogout Hook (TanStack Query mutation)
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/auth-store';
import apiClient from '../lib/api-client';

export default function useLogout() {
  const navigate = useNavigate();
  const clearAll = useAuthStore((s) => s.clearAll);
  const sessionId = useAuthStore((s) => s.sessionId);
  const token = useAuthStore((s) => s.token);

  const mutation = useMutation({
    mutationFn: async () => {
      if (token && sessionId) {
        await apiClient.post('/auth/logout', { sessionId });
      }
    },
    onSuccess: () => {
      clearAll();
      navigate('/login');
    },
    onError: () => {
      // Even on error, clear local state and redirect
      clearAll();
      navigate('/login');
    },
  });

  return {
    mutate: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}