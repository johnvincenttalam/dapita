import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface AuthPageHeaderProps {
  title: ReactNode
  description?: ReactNode
  /** Shown above the title on result screens ("Check your email"). */
  icon?: LucideIcon
}

/** Centered title block for the sign-in, sign-up and account recovery screens. */
export function AuthPageHeader({ title, description, icon: Icon }: AuthPageHeaderProps) {
  return (
    <div className="space-y-2 text-center">
      {Icon ? (
        <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-secondary text-primary">
          <Icon aria-hidden="true" className="size-7" />
        </span>
      ) : null}
      <h1 className="type-title">{title}</h1>
      {description ? <p className="text-sm text-pretty text-muted-foreground">{description}</p> : null}
    </div>
  )
}
