import { useQuery } from '@tanstack/react-query'

import { useSession } from '@/features/auth/api/queries'
import { recommendationsService } from '@/services/recommendations.service'
import type { ID } from '@/types/common'

export const recommendationKeys = {
  all: ['recommendations'] as const,
  /** Per viewer, so signing in or out loads that person's picks. */
  forViewer: (userId: ID | undefined) => [...recommendationKeys.all, userId ?? 'guest'] as const,
}

export function useRecommendationsQuery() {
  const { user, isPending } = useSession()
  return useQuery({
    queryKey: recommendationKeys.forViewer(user?.id),
    queryFn: () => recommendationsService.listRecommendations(),
    enabled: !isPending,
  })
}
