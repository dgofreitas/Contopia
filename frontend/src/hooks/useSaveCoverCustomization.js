import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/api-client';

export function useSaveCoverCustomization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ bookId, templateId, coverColor, coverPattern, spineColor, spineCustomized, edgeColor, edgePattern, edgeCustomized, coverTitle, stickers, coverAssetId }) => {
      const { data } = await apiClient.patch(`/v1/books/${bookId}`, {
        templateId,
        coverColor,
        coverPattern,
        spineColor,
        spineCustomized,
        edgeColor,
        edgePattern,
        edgeCustomized,
        coverTitle,
        stickers,
        coverAssetId,
      });
      return data;
    },
    onSuccess: (_, { bookId }) => {
      queryClient.invalidateQueries({ queryKey: ['bookEdit', bookId] });
    },
  });
}
