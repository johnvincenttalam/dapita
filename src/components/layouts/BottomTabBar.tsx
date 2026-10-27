import { NavLink } from 'react-router'

import { customerTabs } from '@/config/navigation'
import { useUnreadMessageCount } from '@/features/messaging/api/queries'
import { cn } from '@/lib/utils'

/** Mobile primary navigation (design screen 3). Hidden from `md` up, where the header takes over. */
export function BottomTabBar() {
  const unread = useUnreadMessageCount()
  return (
    <nav
      aria-label="Tab bar"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-backdrop-filter:bg-card/85 md:hidden"
    >
      <ul className="mx-auto grid h-tabbar max-w-lg grid-cols-5">
        {customerTabs.map(({ to, title, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex h-full flex-col items-center justify-center gap-1 type-micro font-medium transition-colors outline-none focus-visible:bg-accent',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )
              }
            >
              <span className="relative">
                <Icon aria-hidden="true" className="size-5" />
                {to === '/inbox' && unread ? (
                  <span
                    aria-hidden="true"
                    className="absolute -top-1.5 -right-2.5 min-w-4 rounded-full bg-primary px-1 text-center type-micro leading-4 text-primary-foreground tabular-nums"
                  >
                    {unread}
                  </span>
                ) : null}
              </span>
              {title}
              {to === '/inbox' && unread ? <span className="sr-only">, {unread} unread</span> : null}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
