import type { ColumnOptions } from '@adonisjs/lucid/types/model'

/**
 * Column helpers that keep model values in the same shape as the API types in
 * `src/types`, whatever the database driver returns.
 */

/** Nested values stored as json. The driver returns them parsed; strings are parsed here. */
export const json: Partial<ColumnOptions> = {
  prepare: (value: unknown) =>
    value === null || value === undefined ? null : JSON.stringify(value),
  consume: (value: unknown) => (typeof value === 'string' ? JSON.parse(value) : (value ?? null)),
}

/**
 * Instants kept as ISO 8601 strings (`ISODateTime`), exactly as the API sends them.
 * PostgreSQL stores them as timestamptz and returns a Date, turned back into the string.
 */
export const iso: Partial<ColumnOptions> = {
  consume: (value: unknown) => (value instanceof Date ? value.toISOString() : (value ?? null)),
}

/** Always a real boolean, whatever the driver returns. */
export const bool: Partial<ColumnOptions> = {
  consume: (value: unknown) => Boolean(value),
}
