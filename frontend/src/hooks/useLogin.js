// Contopia — useLogin Hook (TanStack Query mutation)
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../stores/auth-store';
import apiClient from '../lib/api-client';

export default function useLogin() {
  const { t } = useTranslation();
  const setToken = useAuthStore((s) => s.setToken);
  const setRefreshToken = useAuthStore((s) => s.setRefreshToken);
  const setUser = useAuthStore((s) => s.setUser);
  const setOnboardingComplete = useAuthStore((s) => s.setOnboardingComplete);
  const setSession = useAuthStore((s) => s.setSession);
  const updateActivity = useAuthStore((s) => s.updateActivity);

  const mutation = useMutation({
    mutationFn: async ({ method, childId, password, parentEmail, childFirstName }) => {
      const response = await apiClient.post('/auth/login', {
        method,
        ...(method === 'password' ? { childId, password } : {}),
        ...(method === 'magic-link' ? { parentEmail, childFirstName } : {}),
      });
      return response.data;
    },
    onSuccess: (data) => {
      // Password login: tokens issued
      if (data?.data?.accessToken) {
        setToken(data.data.accessToken);
        if (data.data.refreshToken) {
          setRefreshToken(data.data.refreshToken);
        }
        setUser({
          childId: data.data.childId,
          childFirstName: data.data.childFirstName,
        });
        setOnboardingComplete(data.data.isOnboardingComplete);
        setSession({
          sessionId: data.data.sessionId,
          sessionCreatedAt: data.data.sessionCreatedAt,
          lastActivity: Date.now(),
        });
        updateActivity();
      }
      // Magic link: no token yet, just confirmation
    },
  });

  const getErrorMessage = (error) => {
    const code = error?.response?.data?.error?.code;
    if (code === 'INVALID_CREDENTIALS') return t('login.errorInvalidCredentials');
    if (code === 'NOT_VERIFIED') return t('login.errorNotVerified');
    if (code === 'NOT_FOUND') return t('login.errorNotFound');
    if (error?.response?.status === 429 || code === 'RATE_LIMITED')
      return t('login.errorRateLimited');
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