import { useT } from '~/composables/use_t'
import { parseDisplayDate } from '~/utils/local_datetime'

export function useReservationFormat() {
  const { locale } = useT()

  function formatDate(iso: string): string {
    return parseDisplayDate(iso).toLocaleDateString(locale.value, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  return { formatDate }
}
