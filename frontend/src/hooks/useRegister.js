// Contopia — useRegister Hook (TanStack Query mutation)
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../stores/auth-store';

export default function useRegister() {
  const { t } = useTranslation('auth');
  const setToken = useAuthStore((s) => s.setToken);
  const setUser = useAuthStore((s) => s.setUser);

  const mutation = useMutation({
    mutationFn: async ({ parentEmail, childFirstName }) => {
      const response = await axios.post('/api/auth/register', {
        parentEmail,
        childFirstName,
      });
      return response.data;
    },
    onSuccess: (data) => {
      // Register response only returns { parentId, emailSent } — no token until login
    },
    onError: (error) => {
      // Errors are mapped by consumers via getErrorMessage
    },
  });

  const getErrorMessage = (error) => {
    const status = error?.response?.status;
    if (status === 409) return t('register.errorAccountExists');
    if (status === 422) return t('register.errorEmailInvalid');
    if (status === 429) return t('register.errorRateLimited');
    return t('register.errorGeneric');
  };

  return {
    mutate: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
    getErrorMessage,
  };
}