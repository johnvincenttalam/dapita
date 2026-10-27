// Builds an iCalendar (.ics) file for a confirmed appointment, so customers can
// add it to any calendar app without a server endpoint (plan §7.3 lists one for later).

export interface CalendarEvent {
  uid: string
  title: string
  start: string | Date
  end: string | Date
  location?: string
  description?: string
}

/** 2026-07-12T05:30:00.000Z → 20260712T053000Z */
function icsDate(value: string | Date) {
  return new Date(value)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')
}

/** Escapes text per RFC 5545 §3.3.11. */
function icsText(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/([,;])/g, '\\$1')
}

export function createIcs(event: CalendarEvent, now: Date = new Date()) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Dapita//Bookings//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${icsDate(now)}`,
    `DTSTART:${icsDate(event.start)}`,
    `DTEND:${icsDate(event.end)}`,
    `SUMMARY:${icsText(event.title)}`,
    event.location ? `LOCATION:${icsText(event.location)}` : null,
    event.description ? `DESCRIPTION:${icsText(event.description)}` : null,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.filter(Boolean).join('\r\n') + '\r\n'
}

/** Starts a download of `event` as an .ics file. */
export function downloadIcs(event: CalendarEvent, filename = 'appointment.ics') {
  const url = URL.createObjectURL(new Blob([createIcs(event)], { type: 'text/calendar;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
