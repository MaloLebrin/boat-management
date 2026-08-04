import { useT } from '~/composables/use_t'
import { parseDisplayDate } from '~/utils/local_datetime'

export function useDateFormat() {
  const { locale } = useT()

  function formatDate(iso: string | null | undefined): string {
    if (!iso) return '—'
    return parseDisplayDate(iso).toLocaleDateString(locale.value, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  function formatDateTime(iso: string | null | undefined): string {
    if (!iso) return '—'
    return parseDisplayDate(iso).toLocaleString(locale.value)
  }

  return { formatDate, formatDateTime }
}
