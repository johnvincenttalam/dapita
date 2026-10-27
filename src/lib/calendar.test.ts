import { describe, expect, it } from 'vitest'

import { createIcs } from '@/lib/calendar'

describe('createIcs', () => {
  it('builds a UTC event with escaped text and CRLF line endings', () => {
    const ics = createIcs(
      {
        uid: 'bk_1@dapita',
        title: 'Men’s Haircut, The Good Cut',
        start: '2026-07-12T05:30:00.000Z',
        end: '2026-07-12T06:00:00.000Z',
        location: '118 C.M. Recto St; Poblacion',
      },
      new Date('2026-07-01T00:00:00.000Z'),
    )
    expect(ics.split('\r\n')).toEqual(
      expect.arrayContaining([
        'BEGIN:VCALENDAR',
        'UID:bk_1@dapita',
        'DTSTAMP:20260701T000000Z',
        'DTSTART:20260712T053000Z',
        'DTEND:20260712T060000Z',
        'SUMMARY:Men’s Haircut\\, The Good Cut',
        'LOCATION:118 C.M. Recto St\\; Poblacion',
        'END:VCALENDAR',
      ]),
    )
    expect(ics.endsWith('\r\n')).toBe(true)
  })
})
