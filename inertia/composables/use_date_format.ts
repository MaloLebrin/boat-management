import { useT } from '~/composables/use_t'

export function useDateFormat() {
  const { locale } = useT()

  function formatDate(iso: string | null | undefined): string {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString(locale.value, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  function formatDateTime(iso: string | null | undefined): string {
    if (!iso) return '—'
    return new Date(iso).toLocaleString(locale.value)
  }

  return { formatDate, formatDateTime }
}
