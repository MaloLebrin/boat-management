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

/**
 * Formats a Date as the `YYYY-MM-DD` value a `<input type="date">` expects.
 * This is a machine format, never shown to the user — user-facing dates go
 * through `useDateFormat()`.
 */
export function toDateInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Today's local calendar day, ready to prefill a `date` input. */
export function todayDateInputValue(): string {
  return toDateInputValue(new Date())
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

/**
 * Re-exported for the components that still parse a backend date by hand.
 * Rendering one goes through `useDateFormat()`, which parses it the same way.
 */
export { parseDisplayDate } from '../../shared/helpers/date_format'
