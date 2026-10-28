import { HeartIcon } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { useSession } from '@/features/auth/api/queries'
import { signInHref } from '@/features/auth/links'
import { useMyFavoritesQuery, useToggleFavoriteMutation } from '@/features/favorites/api/queries'
import { hasAnyRole } from '@/lib/roles'
import { cn } from '@/lib/utils'
import type { ID } from '@/types/common'

interface FavoriteButtonProps {
  businessId: ID
  shopName: string
  className?: string
}

const buttonClass = 'bg-card/90 shadow-sm backdrop-blur hover:bg-card'

/**
 * Heart toggle that saves a shop to Favorites (CUS-07). Guests sign in first and come back
 * here; the shop's own team, and admins, don't see it.
 */
export function FavoriteButton({ businessId, shopName, className }: FavoriteButtonProps) {
  const { user, isPending: sessionPending } = useSession()
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const isCustomer = hasAnyRole(user, ['customer'])
  const favorites = useMyFavoritesQuery({ enabled: isCustomer })
  const toggle = useToggleFavoriteMutation()

  if (sessionPending) return null
  if (!user) {
    return (
      <Button asChild variant="secondary" size="icon" shape="pill" className={cn(buttonClass, className)}>
        <Link to={signInHref(pathname + search)} aria-label={`Save ${shopName}`}>
          <HeartIcon aria-hidden="true" />
        </Link>
      </Button>
    )
  }
  const ownShop = user.memberships.some((membership) => membership.businessId === businessId)
  if (ownShop || !isCustomer) return null

  const listed = Boolean(favorites.data?.some((shop) => shop.id === businessId))
  const saved = toggle.isPending ? toggle.variables.save : listed

  return (
    <Button
      variant="secondary"
      size="icon"
      shape="pill"
      aria-label={`Save ${shopName}`}
      aria-pressed={saved}
      // Until the list loads, the heart can't tell whether the shop is saved.
      disabled={favorites.isPending}
      onClick={() =>
        toggle.mutate(
          { businessId, save: !saved },
          {
            onSuccess: (_, { save }) => {
              if (save) {
                toast.success('Saved to favorites', {
                  action: { label: 'View', onClick: () => void navigate('/favorites') },
                })
              }
            },
          },
        )
      }
      className={cn(buttonClass, className)}
    >
      <HeartIcon aria-hidden="true" className={cn(saved && 'fill-primary text-primary')} />
    </Button>
  )
}
