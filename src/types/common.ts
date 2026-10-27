// Primitive aliases shared by the domain types. Field names follow
// docs/implementation-plan.md §7.1 and stay proposals until an API contract exists.

/** Opaque, immutable identifier (never an email or phone number, doc §11.1). */
export type ID = string

/** ISO 8601 instant in UTC, e.g. `2026-10-21T05:30:00.000Z`. Displayed in the market time zone. */
export type ISODateTime = string

/** Calendar date `YYYY-MM-DD` in the market time zone. */
export type DateKey = string

/** Wall-clock time `HH:mm` (24-hour) in the market time zone. `24:00` means end of day. */
export type TimeOfDay = string

export interface Coordinates {
  lat: number
  lng: number
}
