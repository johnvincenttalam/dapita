import { Outlet } from 'react-router'

import { SkipLink } from '@/components/layouts/SkipLink'

/** Full-bleed onboarding screens without app chrome: Welcome and Get started (design screens 1–2). */
export function WelcomeLayout() {
  return (
    <>
      <SkipLink />
      <main id="main-content" tabIndex={-1} className="min-h-svh outline-none">
        <Outlet />
      </main>
    </>
  )
}
