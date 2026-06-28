export function useReservationFormat() {
  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  return { formatDate }
}
