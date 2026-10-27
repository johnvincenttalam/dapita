import { useNavigation } from 'react-router'

/** Thin bar at the top of the viewport while a lazy route is loading. */
export function NavigationProgress() {
  const navigation = useNavigation()
  if (navigation.state === 'idle') return null

  return (
    <div
      role="progressbar"
      aria-label="Loading page"
      className="fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden bg-primary/20"
    >
      <div className="h-full w-1/3 animate-progress bg-primary" />
    </div>
  )
}
