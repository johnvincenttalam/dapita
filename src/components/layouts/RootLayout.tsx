import { Outlet } from 'react-router'

import { LoadingIndicator } from '@/components/feedback/LoadingIndicator'
import { NavigationProgress } from '@/components/feedback/NavigationProgress'
import { RealtimeSync } from '@/features/realtime/use-realtime-sync'

/** Top of the route tree: global UI that every layout shares. */
export function RootLayout() {
  return (
    <>
      <NavigationProgress />
      <RealtimeSync />
      <Outlet />
    </>
  )
}

/** Shown while the first lazy route chunk loads. */
export function AppLoading() {
  return <LoadingIndicator label="Loading app…" className="min-h-svh" />
}
