/**
 * Single source of truth for rendering a date to the user (#461).
 *
 * Before this helper, every screen built its own `toLocaleDateString(...)` call:
 * some passed the app locale, some passed `undefined` (→ the *browser* locale,
 * so an EN user on a French machine got `03/08/2026`), some hardcoded `'fr-FR'`.
 * The same locale therefore rendered dates three different ways (planning
 * `07/15/2026`, logbook `Aug 4, 2026`, audit log `03/08/2026, 15:14:34`).
 *
 * Rules:
 *   - the app locale (`fr` / `en`) always drives the output — never the browser
 *     nor the server timezone/locale;
 *   - a screen picks a *style* (`formatDate`, `formatDateLong`, …), never its
 *     own `Intl.DateTimeFormat` options.
 *
 * Frontend code goes through `useDateFormat()`, which binds the reactive locale
 * and renders empty values as `—`. Backend code (PDF services) calls these
 * functions directly with `i18n.locale`.
 */

/** The app locales, matching the `resources/lang/` subdirectories. */
export type AppLocale = 'fr' | 'en'

/**
 * Explicit BCP 47 tags. `Intl` would resolve the bare `'en'` to `en-US` anyway,
 * but pinning the tag keeps the rendering identical across runtimes (Node's ICU
 * build, the browser, the PDF worker) instead of depending on their defaults.
 */
const LOCALE_TAGS: Record<AppLocale, string> = {
  fr: 'fr-FR',
  en: 'en-US',
}

/** Placeholder for a missing date — kept here so every screen renders the same glyph. */
export const EMPTY_DATE = '—'

/** Maps an app locale (or anything close, e.g. `fr-CA`) to its canonical tag. */
export function resolveLocaleTag(locale: string | null | undefined): string {
  const base = String(locale ?? '')
    .slice(0, 2)
    .toLowerCase()
  return LOCALE_TAGS[base as AppLocale] ?? LOCALE_TAGS.en
}

/** Calendar dates are serialised by the transformers as `YYYY-MM-DD` (`toISODate()`). */
const PLAIN_DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Parses a value coming from the backend for display.
 *
 * `new Date('2026-08-03')` is spec'd to parse as UTC midnight, so rendering it in
 * the browser zone slides the day back for any negative offset (a fuel log filled
 * on Aug 3 shows Aug 2 in UTC-5 — see #452). A calendar date carries no instant:
 * anchor it at local midnight so it renders as the same day everywhere.
 * Full ISO timestamps are real instants and keep their local rendering.
 */
export function parseDisplayDate(value: string | Date): Date {
  if (value instanceof Date) return value
  if (!PLAIN_DATE.test(value)) return new Date(value)
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function render(
  value: string | Date,
  locale: string | null | undefined,
  options: Intl.DateTimeFormatOptions
): string {
  const date = parseDisplayDate(value)
  if (Number.isNaN(date.getTime())) return EMPTY_DATE
  return new Intl.DateTimeFormat(resolveLocaleTag(locale), options).format(date)
}

/** Default style for tables and lists — `15/07/2026` (fr) · `07/15/2026` (en). */
export function formatDate(value: string | Date, locale?: string | null): string {
  return render(value, locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Headings and single-value cards — `15 juillet 2026` (fr) · `July 15, 2026` (en). */
export function formatDateLong(value: string | Date, locale?: string | null): string {
  return render(value, locale, { day: 'numeric', month: 'long', year: 'numeric' })
}

/** Compact ranges where the year is implied — `15 juil.` (fr) · `Jul 15` (en). */
export function formatDayMonth(value: string | Date, locale?: string | null): string {
  return render(value, locale, { day: 'numeric', month: 'short' })
}

/** Month navigation and timeline groups — `juillet 2026` (fr) · `July 2026` (en). */
export function formatMonthYear(value: string | Date, locale?: string | null): string {
  return render(value, locale, { month: 'long', year: 'numeric' })
}

/** Timestamps — `15/07/2026 15:14` (fr) · `07/15/2026, 03:14 PM` (en). Seconds are never shown. */
export function formatDateTime(value: string | Date, locale?: string | null): string {
  return render(value, locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Time of day alone — `15:14` (fr) · `03:14 PM` (en). */
export function formatTime(value: string | Date, locale?: string | null): string {
  return render(value, locale, { hour: '2-digit', minute: '2-digit' })
}

/**
 * Agenda rows — `mer. 15` (fr) · `Wed 15` (en).
 *
 * Composed by hand rather than through a single `{ weekday, day }` pattern:
 * ICU renders that as `15 Wed` in `en-US`, which reads as a typo next to the
 * French `mer. 15`. The point of this module is that a date looks the same
 * everywhere, so the weekday leads in both locales.
 */
export function formatWeekdayDay(value: string | Date, locale?: string | null): string {
  const weekday = render(value, locale, { weekday: 'short' })
  const day = render(value, locale, { day: 'numeric' })
  return `${weekday} ${day}`
}

/**
 * Calendar column headers — `Lun` (fr) · `Mon` (en).
 * `Intl` lowercases French weekday abbreviations and adds a trailing dot
 * (`lun.`), hence the manual capitalisation and the 3-character cap.
 */
export function formatWeekdayShort(value: string | Date, locale?: string | null): string {
  const label = render(value, locale, { weekday: 'short' })
  return label.charAt(0).toUpperCase() + label.slice(1, 3)
}
