import { FileCheckIcon } from 'lucide-react'
import { Link } from 'react-router'

import { legalDocuments } from '@/config/legal'
import { formatFullDate } from '@/lib/format'
import type { ConsentRecord } from '@/types/account'

/** The documents the user accepted, with version and date (doc §11 ConsentRecord, §13.2). */
export function ConsentList({ consents }: { consents: ConsentRecord[] }) {
  return (
    <ul className="divide-y divide-border/70">
      {consents.map((consent) => {
        const document = legalDocuments[consent.purpose]
        return (
          <li key={consent.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
            <FileCheckIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-success-emphasis" />
            <div className="min-w-0 space-y-0.5">
              <Link to={document.href} className="font-medium underline-offset-4 hover:underline">
                {document.title}
              </Link>
              <p className="text-sm text-muted-foreground">
                {consent.purpose === 'privacy_notice' ? 'Read' : 'Accepted'} {formatFullDate(consent.grantedAt)} ·
                version {consent.version}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
