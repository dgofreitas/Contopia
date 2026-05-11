// Contopia — useRefresh Hook (silent token refresh)
import { useMutation } from '@tanstack/react-query';
import useAuthStore from '../stores/auth-store';
import axios from 'axios';

export default function useRefresh() {
  const setToken = useAuthStore((s) => s.setToken);
  const setRefreshToken = useAuthStore((s) => s.setRefreshToken);
  const updateActivity = useAuthStore((s) => s.updateActivity);

  const mutation = useMutation({
    mutationFn: async () => {
      const { refreshToken } = useAuthStore.getState();
      if (!refreshToken) throw new Error('No refresh token');
      const response = await axios.post('/api/auth/refresh', { refreshToken });
      return response.data;
    },
    onSuccess: (data) => {
      if (data?.data?.accessToken) {
        setToken(data.data.accessToken);
        if (data.data.refreshToken) {
          setRefreshToken(data.data.refreshToken);
        }
        updateActivity();
      }
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}