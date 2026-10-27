import { useLocation, useNavigate } from 'react-router'

/**
 * Goes back in history, or to `fallback` when this page is the first entry of
 * the session (opened from a shared link), so "Back" never leaves the app.
 */
export function useBackNavigation(fallback = '/') {
  const navigate = useNavigate()
  const location = useLocation()
  // "default" is the key React Router gives the first history entry.
  return () => void (location.key === 'default' ? navigate(fallback) : navigate(-1))
}
