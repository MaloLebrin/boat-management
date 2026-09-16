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

export interface FormatCurrencyOptions {
  /** Code ISO 4217 — `EUR` par défaut, l'app est mono-devise. */
  currency?: string
  /** Décimales affichées — `2` par défaut ; `0` pour une estimation en euros ronds. */
  fractionDigits?: number
}

/**
 * A currency amount — `1 234,56 €` (fr) · `€1,234.56` (en).
 *
 * Every email job and PDF used to build its own `Intl.NumberFormat`, some with
 * `'fr-FR'` hardcoded (an English lead read `1 200 €`), one with `undefined`
 * (the *server* locale, whatever the container happens to run with). The
 * locale is always the reader's, resolved by `resolveLocaleTag` like dates.
 */
export function formatCurrency(
  value: number,
  locale?: string | null,
  options: FormatCurrencyOptions = {}
): string {
  const digits = options.fractionDigits ?? 2
  return new Intl.NumberFormat(resolveLocaleTag(locale), {
    style: 'currency',
    currency: options.currency ?? 'EUR',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}
