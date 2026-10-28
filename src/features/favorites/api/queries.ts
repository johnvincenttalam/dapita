import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

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
    onSettled: () => queryClient.invalidateQueries({ queryKey: favoriteKeys.all }),
  })
}
