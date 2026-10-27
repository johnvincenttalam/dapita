import { Link } from 'react-router'

import { legalDocuments } from '@/config/legal'
import type { AccountType } from '@/types/auth'

function DocumentLink({ purpose }: { purpose: keyof typeof legalDocuments }) {
  const document = legalDocuments[purpose]
  return (
    <Link
      to={document.href}
      target="_blank"
      rel="noreferrer"
      className="font-medium text-primary underline underline-offset-4"
    >
      {document.title}
      <span className="sr-only"> (opens in a new tab)</span>
    </Link>
  )
}

/** Label of the sign-up acceptance checkbox. The documents open in a new tab so the form isn't lost. */
export function LegalConsentLabel({ accountType }: { accountType: AccountType }) {
  return accountType === 'business' ? (
    <span>
      I agree to the <DocumentLink purpose="terms" /> and the <DocumentLink purpose="merchant_policy" />, and I’ve read
      the <DocumentLink purpose="privacy_notice" />
    </span>
  ) : (
    <span>
      I agree to the <DocumentLink purpose="terms" /> and I’ve read the <DocumentLink purpose="privacy_notice" />
    </span>
  )
}
