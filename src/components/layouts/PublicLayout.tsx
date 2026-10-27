import { Outlet, ScrollRestoration } from 'react-router'

import { AppCommandMenu } from '@/components/layouts/AppCommandMenu'
import { BottomTabBar } from '@/components/layouts/BottomTabBar'
import { Footer } from '@/components/layouts/Footer'
import { Navbar } from '@/components/layouts/Navbar'
import { SkipLink } from '@/components/layouts/SkipLink'
import { customerTabs, type NavGroup } from '@/config/navigation'

const commandNav: NavGroup[] = [{ label: 'Marketplace', items: customerTabs }]

/**
 * Customer marketplace shell, shared by public and signed-in customer pages.
 * Mobile: header + bottom tab bar (the page reserves space for it). Desktop: header + footer.
 */
export function PublicLayout() {
  return (
    <div className="flex min-h-svh flex-col pb-[calc(var(--spacing-tabbar)+env(safe-area-inset-bottom))] md:pb-0">
      <SkipLink />
      <Navbar />
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>
      <Footer />
      <BottomTabBar />
      <AppCommandMenu nav={commandNav} />
      <ScrollRestoration />
    </div>
  )
}
