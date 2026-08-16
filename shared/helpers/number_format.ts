/**
 * Reading and rendering the numbers the user types or sees (#464).
 *
 * Two rules, symmetrical to `date_format`:
 *   - *reading* a field accepts both decimal separators — a numeric keypad
 *     sends `.` whatever the browser locale, and a French keyboard sends `,`.
 *     Neither may silently drop the input;
 *   - *rendering* a measurement always goes through the app locale, so a length
 *     reads `10,5 m` in French and `10.5 m` in English instead of the raw
 *     JavaScript `10.5` glued to a hardcoded `m`.
 */

import { resolveLocaleTag } from './date_format.js'

/**
 * Parses a raw `<input>` value into a number, or `null` when it does not read
 * as one (empty field, `-`, `1.2.3`, a mid-typing `,`).
 *
 * Returning `null` rather than `0` matters: `Number('')` is `0`, and a `0` fed
 * back into a controlled field overwrites what the user is typing.
 */
export function parseDecimalInput(raw: string | null | undefined): number | null {
  const normalized = String(raw ?? '')
    .trim()
    .replace(',', '.')
  if (normalized === '') return null
  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}

/** A length in metres — `10,5 m` (fr) · `10.5 m` (en), separator and space included. */
export function formatLength(value: number, locale?: string | null): string {
  return new Intl.NumberFormat(resolveLocaleTag(locale), {
    style: 'unit',
    unit: 'meter',
    unitDisplay: 'short',
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * A whole-euro price tag — `20 €` (fr) · `€20` (en).
 *
 * The marketing pages used to glue a literal ` €` after the number, so the
 * English pricing page read `20 €` right next to copy announcing `€20` (#465).
 * Which side the symbol sits on is the locale's business, never the template's.
 */
export function formatPrice(value: number, locale?: string | null): string {
  return new Intl.NumberFormat(resolveLocaleTag(locale), {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)
}
