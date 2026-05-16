// Contopia — useVerify Hook (TanStack Query mutation)
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../stores/auth-store';

export default function useVerify() {
  const { t } = useTranslation('auth');
  const setUser = useAuthStore((s) => s.setUser);
  const setOnboardingComplete = useAuthStore((s) => s.setOnboardingComplete);

  const mutation = useMutation({
    mutationFn: async (token) => {
      const response = await axios.get(`/api/auth/verify/${token}`);
      return response.data;
    },
    onSuccess: (data) => {
      // Verify response only returns { childId } — set user after login, not here
      if (data?.childId) {
        setUser({ childId: data.childId });
        setOnboardingComplete(true);
      }
    },
  });

  const getStatus = () => {
    if (mutation.isPending) return 'verifying';
    if (mutation.isSuccess) return 'success';
    if (mutation.isError) {
      const status = mutation.error?.response?.status;
      if (status === 410) return 'expired';
      if (status === 404) return 'invalid';
      return 'error';
    }
    return 'verifying';
  };

  const getErrorMessage = () => {
    const errorStatus = mutation.error?.response?.status;
    if (errorStatus === 410) return t('verify.expired');
    if (errorStatus === 404) return t('verify.invalid');
    return t('register.errorGeneric');
  };

  return {
    mutate: mutation.mutate,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
    data: mutation.data,
    getStatus,
    getErrorMessage,
  };
}