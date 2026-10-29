import type { ConsentPurpose } from '@/types/account'

// Versions of the legal documents a user accepts at sign-up, stored with each
// consent record. ASSUMPTION: the texts are not written yet (plan step 11; legal
// review per doc §13.3), so every version is a draft. Bump a version when its text changes.

export const legalDocuments: Record<ConsentPurpose, { title: string; href: string; version: string }> = {
  terms: { title: 'Terms of use', href: '/legal/terms', version: 'draft-2026-10' },
  privacy_notice: { title: 'Privacy notice', href: '/legal/privacy', version: 'draft-2026-11' },
  merchant_policy: { title: 'Merchant listing policy', href: '/legal/merchant-policy', version: 'draft-2026-10' },
}
