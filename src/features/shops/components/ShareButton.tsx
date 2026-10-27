import { Share2Icon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ShareButtonProps {
  title: string
  className?: string
}

/** Uses the device share sheet where available, otherwise copies the page link. */
export function ShareButton({ title, className }: ShareButtonProps) {
  const share = async () => {
    const url = window.location.href
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url })
      } catch {
        // Dismissing the share sheet rejects; nothing to report.
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied')
    } catch {
      toast.error('Couldn’t copy the link. Copy it from the address bar instead.')
    }
  }

  return (
    <Button
      variant="secondary"
      size="icon"
      shape="pill"
      aria-label={`Share ${title}`}
      onClick={() => void share()}
      className={cn('bg-card/90 shadow-sm backdrop-blur hover:bg-card', className)}
    >
      <Share2Icon aria-hidden="true" />
    </Button>
  )
}
