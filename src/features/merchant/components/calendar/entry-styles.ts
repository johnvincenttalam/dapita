import type { EntryKind } from '@/lib/merchant-calendar'

/**
 * Booking state, using the status tones (DESIGN.md: status colours describe real state). Unagreed slots
 * are dashed. Tints are mixed into the card colour rather than layered with opacity, so blocks stay
 * solid and the day grid's "now" line passes behind them instead of through their text.
 */
export const entryStyles: Record<EntryKind, { label: string; className: string }> = {
  confirmed: {
    label: 'confirmed',
    className:
      'bg-[color-mix(in_oklab,var(--color-success)_12%,var(--color-card))] ring-1 ring-success/30 dark:bg-[color-mix(in_oklab,var(--color-success)_20%,var(--color-card))]',
  },
  request: {
    label: 'request',
    className:
      'border border-dashed border-warning-emphasis/60 bg-[color-mix(in_oklab,var(--color-warning)_12%,var(--color-card))] dark:bg-muted',
  },
  proposed: {
    label: 'new time proposed',
    className:
      'border border-dashed border-info/60 bg-[color-mix(in_oklab,var(--color-info)_10%,var(--color-card))] dark:bg-[color-mix(in_oklab,var(--color-info)_15%,var(--color-card))]',
  },
  done: { label: 'done', className: 'bg-muted text-muted-foreground' },
}
