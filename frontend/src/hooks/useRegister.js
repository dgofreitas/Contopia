// Contopia — useRegister Hook (TanStack Query mutation)
// STORY-057: Direct parent registration (email + password + ageConsent)
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import useParentAuthStore from '../stores/parent-auth-store';

export default function useRegister() {
  const { t } = useTranslation('auth');
  const register = useParentAuthStore((s) => s.register);

  const mutation = useMutation({
    mutationFn: async ({ email, password, ageConsent }) => {
      const response = await axios.post('/api/auth/register', {
        email,
        password,
        ageConsent,
      });
      return response.data;
    },
    onSuccess: (data) => {
      const { accessToken, parentId, email, children } = data.data;
      register({ accessToken, parentId, email, children });
    },
  });

  const getErrorMessage = (error) => {
    const status = error?.response?.status;
    const code = error?.response?.data?.error?.code;
    if (status === 409 || code === 'ACCOUNT_EXISTS') return t('register.errorAccountExists');
    if (status === 400 || code === 'VALIDATION_ERROR') return t('register.errorValidation');
    if (status === 429 || code === 'RATE_LIMITED') return t('register.errorRateLimited');
    return t('register.errorGeneric');
  };

  return {
    mutate: mutation.mutate,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
    data: mutation.data,
    getErrorMessage,
  };
}