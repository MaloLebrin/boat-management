export function sortEnginesByStatus<T extends { status: string }>(engines: T[]): T[] {
  return engines.sort((a, b) => {
    if (a.status === 'operational') return -1
    if (b.status === 'operational') return 1
    if (a.status === 'in_maintenance') return -1
    if (b.status === 'in_maintenance') return 1
    if (a.status === 'out_of_service') return -1
    if (b.status === 'out_of_service') return 1
    if (a.status === 'retired') return -1
    if (b.status === 'retired') return 1
    return 0
  })
}
