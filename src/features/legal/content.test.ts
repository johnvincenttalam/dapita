import { describe, expect, it } from 'vitest'

import { legalContent } from '@/features/legal/content'

const sectionText = (id: string) =>
  JSON.stringify(legalContent.privacy_notice.sections.find((section) => section.id === id)?.blocks ?? [])

describe('privacy notice', () => {
  it('explains suggestions without contradicting that shops see your bookings', () => {
    const why = sectionText('why')
    expect(why).toContain('Suggestions never show anyone what you booked or saved.')
    expect(why).not.toContain('No one else can see what you booked or saved')
  })

  it('says a set location stays on the device', () => {
    expect(sectionText('cookies')).toContain('your browser remembers it on this device only')
  })
})
