import { useEffect, useRef } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'

import { Container } from '@/components/shared/Container'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { accountNav, isUpcoming } from '@/config/navigation'
import { useSession } from '@/features/auth/api/queries'
import { initials } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Signed-in customer area (bookings, inbox, profile), nested inside the marketplace shell.
 * Desktop: account card + vertical nav beside the page. Mobile: a scrollable pill row,
 * since the bottom tab bar already covers Bookings, Inbox and Profile.
 */
export function AccountLayout() {
  const { user } = useSession()
  const { pathname } = useLocation()
  // On phones the pill row shows on section pages only; a booking or conversation has its own back header.
  const atSectionRoot = accountNav.some((item) => item.to === pathname)
  const navRef = useRef<HTMLElement>(null)

  // On phones the pill row scrolls sideways; bring the current section's pill into view.
  useEffect(() => {
    navRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [pathname])

  return (
    <Container className="py-page">
      <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
        <aside className={cn('min-w-0 lg:sticky lg:top-24 lg:self-start', !atSectionRoot && 'hidden lg:block')}>
          {user ? (
            <div className="mb-4 hidden items-center gap-3 rounded-2xl card-surface p-4 lg:flex">
              <Avatar className="size-11">
                <AvatarFallback className="bg-secondary font-semibold text-secondary-foreground">
                  {initials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
          ) : null}
          <nav ref={navRef} aria-label="Account">
            <ul className="-mx-4 flex scroll-px-4 [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0">
              {accountNav.map((item) => (
                <li key={item.to} className="shrink-0">
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 lg:rounded-xl lg:px-3 lg:py-2.5',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card text-muted-foreground ring-1 ring-border hover:text-foreground lg:bg-transparent lg:ring-0 lg:hover:bg-muted',
                      )
                    }
                  >
                    <item.icon aria-hidden="true" className="size-4" />
                    {item.title}
                    {isUpcoming(item) ? (
                      <Badge variant="outline" className="ml-auto">
                        Soon
                      </Badge>
                    ) : null}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </Container>
  )
}
