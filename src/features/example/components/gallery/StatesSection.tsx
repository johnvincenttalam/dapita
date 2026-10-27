import { FolderPlusIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingIndicator } from '@/components/feedback/LoadingIndicator'
import { Button } from '@/components/ui/button'
import { Demo, GallerySection } from '@/features/example/components/gallery/GallerySection'
import { delay } from '@/services/mock/utils'

export function StatesSection() {
  const [retrying, setRetrying] = useState(false)

  return (
    <GallerySection
      id="states"
      title="Loading, empty and error states"
      description="Use these instead of ad-hoc messages so every page handles data states the same way."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <Demo title="Loading" contentClassName="block">
          <LoadingIndicator label="Loading projects…" />
        </Demo>
        <Demo title="Empty" contentClassName="block">
          <EmptyState
            icon={FolderPlusIcon}
            title="No projects yet"
            description="Create your first project to get started."
            action={
              <Button size="sm" onClick={() => toast('This would open a create flow')}>
                New project
              </Button>
            }
          />
        </Demo>
        <Demo title="Error" contentClassName="block">
          <ErrorState
            title="Couldn’t load projects"
            description="The server didn’t respond (simulated)."
            isRetrying={retrying}
            onRetry={async () => {
              setRetrying(true)
              await delay(1200)
              setRetrying(false)
              toast.error('Still failing (this demo always fails)')
            }}
          />
        </Demo>
      </div>
    </GallerySection>
  )
}
