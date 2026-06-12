import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../stores/auth-store';
import parentApiClient from '../lib/parent-api-client';

export default function useChildSession() {
  const navigate = useNavigate();
  const { t } = useTranslation('auth');

  const mutation = useMutation({
    mutationFn: async ({ childId } = {}) => {
      const payload = {};
      if (childId) payload.childId = childId;
      const response = await parentApiClient.post('/auth/child-session', payload);
      return response.data;
    },
    onSuccess: (data) => {
      const { accessToken, childId, childFirstName, sessionId } = data.data;
      useAuthStore.getState().startSessionFromParent({
        accessToken,
        childId,
        childFirstName,
        sessionId,
        isOnboardingComplete: data.data.isOnboardingComplete,
      });
      navigate('/shelf', { replace: true });
    },
  });

  const getErrorMessage = (error) => {
    const status = error?.response?.status;
    const code = error?.response?.data?.error?.code;
    if (status === 401 || code === 'PARENT_SESSION_EXPIRED')
      return t('childSession.parentSessionExpired');
    if (status === 404 || code === 'CHILD_NOT_FOUND')
      return t('childSession.noChildFound');
    return t('register.errorGeneric');
  };

  return {
    startChildSession: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
    getErrorMessage,
  };
}