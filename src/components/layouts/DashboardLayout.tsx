import { MenuIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Outlet, ScrollRestoration } from 'react-router'

import { AppCommandMenu } from '@/components/layouts/AppCommandMenu'
import { AppSidebar, type AppSidebarProps } from '@/components/layouts/AppSidebar'
import { CommandMenuButton } from '@/components/layouts/CommandMenuButton'
import { NotificationsMenu } from '@/components/layouts/NotificationsMenu'
import { SkipLink } from '@/components/layouts/SkipLink'
import { UserMenu } from '@/components/layouts/UserMenu'
import { Breadcrumbs } from '@/components/shared/Breadcrumbs'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, useSidebar } from '@/components/ui/sidebar'
import type { NotificationAudience } from '@/lib/notifications'

/** The design uses a hamburger rather than shadcn's panel icon. */
function SidebarToggle() {
  const { toggleSidebar } = useSidebar()
  return (
    <Button variant="ghost" size="icon" className="-ml-1.5" aria-label="Toggle sidebar" onClick={toggleSidebar}>
      <MenuIcon aria-hidden="true" className="size-5" />
    </Button>
  )
}

export interface DashboardLayoutProps extends AppSidebarProps {
  /** Which mock notifications the bell shows. */
  notifications?: NotificationAudience
  /** Name and role on the account menu trigger (design: business name + "Owner"). */
  accountTitle?: string
  accountSubtitle?: string
  /** Shown above every page, e.g. the listing status while a new shop isn't live yet. */
  banner?: ReactNode
}

/**
 * Shell for the merchant dashboard and admin console (design screen 12): dark collapsible
 * sidebar (a sheet on mobile), top bar with breadcrumbs, search, notifications and account.
 * Area layouts (MerchantLayout, AdminLayout) configure it; pages never import it.
 */
export function DashboardLayout({
  notifications,
  accountTitle,
  accountSubtitle,
  banner,
  ...sidebar
}: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <SkipLink />
      <AppSidebar {...sidebar} />
      <SidebarInset className="bg-background">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-border/70 bg-background/85 px-4 backdrop-blur supports-backdrop-filter:bg-background/70 sm:px-6">
          <SidebarToggle />
          <Separator
            orientation="vertical"
            className="mr-1 hidden sm:block data-vertical:h-5 data-vertical:self-center"
          />
          <Breadcrumbs className="hidden min-w-0 truncate sm:block" />
          <div className="ml-auto flex items-center gap-1">
            <CommandMenuButton />
            {notifications ? <NotificationsMenu audience={notifications} /> : null}
            {/* Theme is also in the account menu, so the toggle can go on very small screens. */}
            <ThemeToggle className="hidden sm:inline-flex" />
            <UserMenu display="detailed" title={accountTitle} subtitle={accountSubtitle} />
          </div>
        </header>
        <main id="main-content" tabIndex={-1} className="flex-1 px-4 py-page outline-none sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            {banner}
            <Outlet />
          </div>
        </main>
      </SidebarInset>
      <AppCommandMenu nav={sidebar.nav} />
      <ScrollRestoration />
    </SidebarProvider>
  )
}
