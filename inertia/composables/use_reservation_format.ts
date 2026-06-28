import { useT } from '~/composables/use_t'

export function useReservationFormat() {
  const { locale } = useT()

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(locale.value, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  return { formatDate }
}
