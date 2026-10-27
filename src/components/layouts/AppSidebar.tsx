import type { ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router'

import { Logo } from '@/components/shared/Logo'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import { isUpcoming, type NavGroup } from '@/config/navigation'

function isItemActive(pathname: string, to: string, end?: boolean) {
  return end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`)
}

function NavGroupSection({ group }: { group: NavGroup }) {
  const { pathname } = useLocation()
  const { isMobile, setOpenMobile } = useSidebar()

  return (
    <SidebarGroup>
      {group.label ? <SidebarGroupLabel>{group.label}</SidebarGroupLabel> : null}
      <SidebarGroupContent>
        <SidebarMenu className="gap-1">
          {group.items.map((item) => {
            const { to, title, icon: Icon, end } = item
            const count = !isUpcoming(item) && item.count ? item.count : 0
            return (
              <SidebarMenuItem key={to}>
                <SidebarMenuButton
                  asChild
                  isActive={isItemActive(pathname, to, end)}
                  tooltip={title}
                  // Design screen 12: roomy items, rose pill for the active page.
                  className="h-10 rounded-lg px-3 data-active:bg-sidebar-primary data-active:text-sidebar-primary-foreground"
                >
                  <NavLink to={to} end={end} onClick={() => isMobile && setOpenMobile(false)}>
                    <Icon aria-hidden="true" />
                    <span>
                      {title}
                      {isUpcoming(item) ? <span className="sr-only"> (coming soon)</span> : null}
                      {count ? (
                        <span className="sr-only">
                          , {count} {item.countLabel ?? 'waiting'}
                        </span>
                      ) : null}
                    </span>
                  </NavLink>
                </SidebarMenuButton>
                {count ? (
                  <SidebarMenuBadge
                    aria-hidden="true"
                    className="top-2.5! right-2 rounded-full bg-sidebar-accent px-2 type-micro font-semibold text-sidebar-foreground tabular-nums"
                  >
                    {count}
                  </SidebarMenuBadge>
                ) : null}
                {isUpcoming(item) ? (
                  <SidebarMenuBadge
                    aria-hidden="true"
                    className="top-2.5! right-2 rounded-full bg-sidebar-accent px-2 type-micro text-sidebar-foreground/80"
                  >
                    Soon
                  </SidebarMenuBadge>
                ) : null}
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

/** Small muted line for the sidebar footer; hidden when the sidebar is collapsed to icons. */
export function SidebarNote({ children }: { children: ReactNode }) {
  return <p className="px-2 pb-1 text-xs text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">{children}</p>
}

export interface AppSidebarProps {
  nav: NavGroup[]
  /** Accessible name of the sidebar's navigation landmark. */
  label: string
  /** Where the logo links. */
  homeTo: string
  /** Line under the wordmark, e.g. "for Business". */
  brandSubtitle?: string
  footer?: ReactNode
}

export function AppSidebar({ nav, label, homeTo, brandSubtitle, footer }: AppSidebarProps) {
  const { state } = useSidebar()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-20 justify-center px-4 group-data-[collapsible=icon]:px-2">
        <Logo to={homeTo} subtitle={brandSubtitle} compact={state === 'collapsed'} onDark />
      </SidebarHeader>
      <SidebarContent className="px-1">
        <nav aria-label={label}>
          {nav.map((group, index) => (
            <NavGroupSection key={group.label ?? index} group={group} />
          ))}
        </nav>
      </SidebarContent>
      {footer ? <SidebarFooter>{footer}</SidebarFooter> : null}
      <SidebarRail />
    </Sidebar>
  )
}
