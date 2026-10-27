import { lazy, Suspense } from 'react'
import { RouterProvider } from 'react-router'

import { AppProviders } from '@/app/providers'
import { router } from '@/app/router'

/**
 * TEMPORARY: the design tweaks panel (features/design-tweaks). On in `npm run dev` (not in
 * tests); in a build only with VITE_DESIGN_TWEAKS=true, e.g. for a stakeholder preview.
 * The condition stays inline so production builds drop the panel's code entirely.
 * Remove this and the folder once the design is signed off.
 */
const DesignTweaks =
  (import.meta.env.DEV && import.meta.env.MODE !== 'test') || import.meta.env.VITE_DESIGN_TWEAKS === 'true'
    ? lazy(() => import('@/features/design-tweaks/DesignTweaks'))
    : null

export function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
      {DesignTweaks ? (
        <Suspense fallback={null}>
          <DesignTweaks />
        </Suspense>
      ) : null}
    </AppProviders>
  )
}
