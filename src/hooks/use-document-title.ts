import { useEffect } from 'react'

import { env } from '@/lib/env'

/** Sets `<title>` to "Page · App name" while the calling component is mounted. */
export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${env.appName}` : env.appName
  }, [title])
}
