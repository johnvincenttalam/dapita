import { MapPinIcon } from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router'

import { NotificationsMenu } from '@/components/layouts/NotificationsMenu'
import { UserMenu } from '@/components/layouts/UserMenu'
import { Container } from '@/components/shared/Container'
import { Logo } from '@/components/shared/Logo'
import { SiteSearchForm } from '@/components/shared/SiteSearchForm'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { market } from '@/config/market'
import { headerNav } from '@/config/navigation'
import { useUnreadMessageCount } from '@/features/messaging/api/queries'
import { useSession } from '@/features/auth/api/queries'
import { cn } from '@/lib/utils'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-full px-3.5 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
    isActive ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
  )

/** The launch city. Davao City is the only market, so this is a label, not a selector. */
function LocationLabel({ className }: { className?: string }) {
  return (
    <p className={cn('flex min-w-0 items-center gap-1.5 text-sm font-semibold', className)}>
      <MapPinIcon aria-hidden="true" className="size-4 shrink-0 text-primary" />
      <span className="sr-only">Location: </span>
      <span className="truncate">{market.city}</span>
    </p>
  )
}

function HeaderAccount() {
  const { user, isPending } = useSession()
  const { pathname, search } = useLocation()

  if (isPending) return <Skeleton aria-hidden="true" className="size-8 rounded-full" />

  if (!user) {
    const next = encodeURIComponent(`${pathname}${search}`)
    return (
      <>
        <Button asChild variant="ghost" className="hidden md:inline-flex">
          <Link to="/business/sign-up">List your business</Link>
        </Button>
        <Button asChild shape="pill" className="px-4">
          <Link to={pathname === '/' ? '/auth/sign-in' : `/auth/sign-in?next=${next}`}>Sign in</Link>
        </Button>
      </>
    )
  }

  return (
    <>
      <NotificationsMenu audience="customer" />
      <UserMenu />
    </>
  )
}

/**
 * Marketplace header. Mobile (design screen 3): mark, location and account actions;
 * primary navigation moves to the bottom tab bar. Desktop: logo, links, search and account.
 */
export function Navbar() {
  const unread = useUnreadMessageCount()
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur supports-backdrop-filter:bg-background/70">
      <Container className="flex h-14 items-center gap-3 md:h-header md:gap-6">
        <Logo compact className="md:hidden" />
        <LocationLabel className="md:hidden" />
        <Logo className="hidden md:inline-flex" />

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {headerNav.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end={item.end} className={linkClass}>
                  {item.title}
                  {item.to === '/inbox' && unread ? (
                    <>
                      <span
                        aria-hidden="true"
                        className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 type-micro text-primary-foreground tabular-nums"
                      >
                        {unread}
                      </span>
                      <span className="sr-only">, {unread} unread</span>
                    </>
                  ) : null}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <SiteSearchForm className="ml-auto hidden w-full max-w-sm lg:block" />

        <div className="ml-auto flex shrink-0 items-center gap-1 lg:ml-0">
          <ThemeToggle className="hidden sm:inline-flex" />
          <HeaderAccount />
        </div>
      </Container>
    </header>
  )
}
