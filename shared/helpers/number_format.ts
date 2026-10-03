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
import {
  DEFAULT_CURRENCY,
  SUPPORTED_CURRENCIES,
  type CurrencyCode,
  type CurrencyOption,
} from '../types/currency.js'

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

/**
 * Reads a nullable `decimal` column into a number. Lucid hands PostgreSQL
 * `decimal` values back as strings (`'120.50'`), so a raw comparison with a
 * payload number never matches; `null`, `undefined` and anything that does not
 * read as a finite number give `null`.
 */
export function decimalColumnToNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
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
  /** Code ISO 4217 — `EUR` par défaut (côté Inertia : la devise de l'organisation). */
  currency?: string
  /**
   * Décimales affichées — par défaut celles de la devise (`2` pour l'euro,
   * `0` pour le yen ou le franc CFP) ; `0` pour une estimation en unités rondes.
   */
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
  const digits = options.fractionDigits
  return new Intl.NumberFormat(resolveLocaleTag(locale), {
    style: 'currency',
    currency: options.currency || DEFAULT_CURRENCY,
    // Sans précision explicite, `Intl` applique les décimales de la devise :
    // `1 200,00 €` mais `¥1,200` — forcer `2` afficherait des centimes de yen.
    ...(digits === undefined
      ? {}
      : { minimumFractionDigits: digits, maximumFractionDigits: digits }),
  }).format(value)
}

/** Garde de type : `'usd'` n'en est pas une, la colonne stocke le code en majuscules. */
export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && (SUPPORTED_CURRENCIES as readonly string[]).includes(value)
}

/** Une devise lue en base ou en prop, ramenée à la devise par défaut si inconnue. */
export function toCurrencyCode(value: unknown): CurrencyCode {
  return isCurrencyCode(value) ? value : DEFAULT_CURRENCY
}

/**
 * Nom localisé d'une devise suivi de son code — `euro (EUR)` · `Euro (EUR)`.
 * Les noms viennent d'ICU (`Intl.DisplayNames`) : aucune clé i18n à maintenir
 * par devise.
 */
export function currencyLabel(code: string, locale?: string | null): string {
  const name = new Intl.DisplayNames([resolveLocaleTag(locale)], { type: 'currency' }).of(code)
  return name && name !== code ? `${name} (${code})` : code
}

/** Les options du `<select>` de devise, dans l'ordre de {@link SUPPORTED_CURRENCIES}. */
export function currencyOptions(locale?: string | null): CurrencyOption[] {
  return SUPPORTED_CURRENCIES.map((value) => ({ value, label: currencyLabel(value, locale) }))
}

/** Décimales d'une devise selon ICU : `2` pour l'euro, `0` pour le yen ou le franc CFP. */
export function currencyFractionDigits(currency: string): number {
  return (
    new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
      .maximumFractionDigits ?? 2
  )
}

/**
 * Montant en plus petite unité de la devise, comme l'attend Stripe
 * (`unit_amount`) : `12.34 EUR` → `1234`, mais `1200 JPY` → `1200`. Multiplier
 * un montant en yens ou en francs CFP par 100 le facturerait cent fois (#627).
 */
export function toMinorUnits(amount: number, currency: string): number {
  return Math.round(amount * 10 ** currencyFractionDigits(currency))
}
