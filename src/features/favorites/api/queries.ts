import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { recommendationKeys } from '@/features/recommendations/api/queries'
import { favoritesService } from '@/services/favorites.service'
import type { ID } from '@/types/common'

export const favoriteKeys = {
  all: ['favorites'] as const,
  mine: () => [...favoriteKeys.all, 'mine'] as const,
}

export function useMyFavoritesQuery({ enabled = true } = {}) {
  return useQuery({ queryKey: favoriteKeys.mine(), queryFn: () => favoritesService.listMyFavorites(), enabled })
}

export interface ToggleFavoriteInput {
  businessId: ID
  save: boolean
}

/**
 * Saves or removes a shop. The heart shows the new state from the mutation's input while it
 * runs (and while the list refetches), so it flips at once and flips back if the call fails.
 */
export function useToggleFavoriteMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ businessId, save }: ToggleFavoriteInput) =>
      save ? favoritesService.saveFavorite(businessId) : favoritesService.removeFavorite(businessId),
    // Saved shops also drop out of the suggestions.
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: favoriteKeys.all }),
        queryClient.invalidateQueries({ queryKey: recommendationKeys.all }),
      ]),
  })
}
