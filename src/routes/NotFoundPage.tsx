import { ArrowLeftIcon, CompassIcon } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router'

import { Button } from '@/components/ui/button'
import { useDocumentTitle } from '@/hooks/use-document-title'

/** Rendered inside the matching layout (marketplace, merchant, admin) so navigation stays available. */
export default function NotFoundPage() {
  useDocumentTitle('Page not found')
  const { pathname } = useLocation()
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center gap-8 px-4 py-section text-center">
      <div className="space-y-4">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-secondary text-secondary-foreground">
          <CompassIcon aria-hidden="true" className="size-7" />
        </span>
        <p className="type-eyebrow text-primary">Error 404</p>
        <h1 className="type-title">Page not found</h1>
        <p className="mx-auto max-w-md text-muted-foreground">
          Nothing lives at{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm break-all">{pathname}</code>. It may have
          moved, or the link may be mistyped.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild shape="pill" size="lg" className="px-5">
          <Link to="/">
            <ArrowLeftIcon aria-hidden="true" />
            Back to home
          </Link>
        </Button>
        <Button variant="outline" shape="pill" size="lg" className="px-5" onClick={() => void navigate(-1)}>
          Go back
        </Button>
      </div>
    </div>
  )
}
