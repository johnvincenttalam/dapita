import { Link } from 'react-router'

import { MockNotice } from '@/components/shared/MockNotice'
import { Button } from '@/components/ui/button'
import { verifyHref } from '@/features/auth/links'
import { mockVerificationToken } from '@/services/auth.service'

/** Prototype only: opens the link the verification email would contain, since no email is sent. */
export function MockVerificationLink({ userId, next }: { userId: string; next: string | null }) {
  return (
    <MockNotice>
      <span className="block">No email is sent in the prototype. Open the link it would contain instead.</span>
      <Button asChild variant="outline" size="sm" shape="pill" className="mt-2">
        <Link to={verifyHref({ next, token: mockVerificationToken(userId) })}>Open verification link</Link>
      </Button>
    </MockNotice>
  )
}
