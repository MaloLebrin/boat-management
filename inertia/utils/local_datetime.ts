/**
 * Helpers around `<input type="datetime-local">`, whose value is always a naive
 * wall-clock string (`YYYY-MM-DDTHH:mm`) with no timezone information.
 *
 * The server cannot guess the browser's zone, so every form submitting such a
 * field must also send `tzOffsetMinutes()`; the backend shifts the wall-clock to
 * the right UTC instant with `toUtcFromLocalInput` (see #452).
 */

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Formats a Date as the naive local wall-clock a `datetime-local` input expects. */
export function toDatetimeLocalValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Current local wall-clock, ready to prefill a `datetime-local` input. */
export function nowDatetimeLocalValue(): string {
  return toDatetimeLocalValue(new Date())
}

/** Converts a stored UTC ISO instant back to the local wall-clock to edit it. */
export function isoToDatetimeLocalValue(iso: string): string {
  return toDatetimeLocalValue(new Date(iso))
}

/**
 * Minutes to add to the local wall-clock to reach UTC (`-600` for UTC+10).
 * Read at submit time so a value queued offline carries the offset it was
 * typed in, not the one in effect when the queue is flushed.
 */
export function tzOffsetMinutes(): number {
  return new Date().getTimezoneOffset()
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
export function parseDisplayDate(iso: string): Date {
  if (!PLAIN_DATE.test(iso)) return new Date(iso)
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}
