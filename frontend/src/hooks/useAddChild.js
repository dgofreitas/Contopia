// Contopia — useAddChild Hook (TanStack Query mutation)
// STORY-062: Create a child profile via POST /api/parent/children
import { useMutation, useQueryClient } from '@tanstack/react-query';
import parentApiClient from '../lib/parent-api-client';

export default function useAddChild() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ firstName, dateOfBirth, avatarSeed }) => {
      const body = { firstName };
      if (dateOfBirth) body.dateOfBirth = dateOfBirth;
      if (avatarSeed) body.avatarSeed = avatarSeed;
      const response = await parentApiClient.post('/children', body);
      return response.data.data; // { childId, firstName, avatarSeed }
    },
    onSuccess: () => {
      // Invalidate dashboard so the new child appears in the list
      queryClient.invalidateQueries({ queryKey: ['parent-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['parent-activity-summary'] });
      queryClient.invalidateQueries({ queryKey: ['parent-activity-books'] });
      // Invalidate parent-user (/me) so parentUser.childFirstName/childId refresh
      queryClient.invalidateQueries({ queryKey: ['parent-user'] });
    },
  });
}