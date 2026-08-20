import { useT } from '~/composables/use_t'
import {
  EMPTY_DATE,
  formatDate as renderDate,
  formatDateLong as renderDateLong,
  formatDateTime as renderDateTime,
  formatDayMonth as renderDayMonth,
  formatMonthYear as renderMonthYear,
  formatTime as renderTime,
  formatWeekdayDay as renderWeekdayDay,
  formatWeekdayShort as renderWeekdayShort,
} from '../../shared/helpers/date_format'

type DateInput = string | Date | null | undefined
type Renderer = (value: string | Date, locale?: string | null) => string

/**
 * Locale-aware date rendering for every Inertia screen (#461).
 *
 * Never call `toLocaleDateString` / `toLocaleString` directly in a component:
 * without an explicit locale they follow the *browser*, which is how the same
 * EN session ended up showing three different date formats. Pick a style here
 * instead — the styles themselves live in `shared/helpers/date_format`.
 */
export function useDateFormat() {
  const { locale } = useT()

  function bind(render: Renderer): (value: DateInput) => string {
    return (value) => (value ? render(value, locale.value) : EMPTY_DATE)
  }

  return {
    /** `15/07/2026` · `07/15/2026` — tables and lists. */
    formatDate: bind(renderDate),
    /** `15 juillet 2026` · `July 15, 2026` — headings and single-value cards. */
    formatDateLong: bind(renderDateLong),
    /** `15 juil.` · `Jul 15` — compact ranges. */
    formatDayMonth: bind(renderDayMonth),
    /** `juillet 2026` · `July 2026` — month navigation, timeline groups. */
    formatMonthYear: bind(renderMonthYear),
    /** `15/07/2026 15:14` · `07/15/2026, 03:14 PM` — timestamps. */
    formatDateTime: bind(renderDateTime),
    /** `15:14` · `03:14 PM` — time of day alone. */
    formatTime: bind(renderTime),
    /** `lun. 15` · `Mon 15` — agenda rows. */
    formatWeekdayDay: bind(renderWeekdayDay),
    /** `Lun` · `Mon` — calendar column headers. */
    formatWeekdayShort: bind(renderWeekdayShort),
  }
}
