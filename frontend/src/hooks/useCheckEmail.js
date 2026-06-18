// Contopia — useCheckEmail Hook (TanStack Query mutation)
// STORY-062: Check if a parent email already exists
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';

export default function useCheckEmail() {
  const mutation = useMutation({
    mutationFn: async ({ email }) => {
      const response = await axios.post('/api/auth/check-email', { email });
      return response.data.data; // { exists: boolean }
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,
  };
}