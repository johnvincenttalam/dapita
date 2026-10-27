import { FlaskConicalIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { env } from '@/lib/env'

interface MockNoticeProps {
  children: ReactNode
  className?: string
}

/**
 * Says plainly that an operation is simulated. Renders only in mock mode
 * (`VITE_USE_MOCKS`), so it disappears once a real backend is connected.
 */
export function MockNotice({ children, className }: MockNoticeProps) {
  if (!env.useMocks) return null
  return (
    <Alert variant="warning" className={className}>
      <FlaskConicalIcon aria-hidden="true" />
      <AlertTitle>Prototype · simulated</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  )
}
