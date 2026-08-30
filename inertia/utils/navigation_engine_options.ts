import type { BoatShowEngine, NavigationLogEngineOption } from '~/types/boat_show'
import { engineSerialSuffix } from '~/utils/boat_enum_labels'

/** Engine statuses that make an engine unavailable for hour tracking. */
const INACTIVE_ENGINE_STATUSES = ['out_of_service', 'retired']

function engineLabel(
  t: (key: string) => string,
  engine: Pick<BoatShowEngine, 'id' | 'brand' | 'model' | 'serialNumber'>
): string {
  const label = [engine.brand, engine.model].filter(Boolean).join(' ').trim()
  return `${label || `#${engine.id}`}${engineSerialSuffix(t, engine.serialNumber)}`
}

/**
 * Maps a boat's engines to selectable options for the trip-close form, keeping
 * only active engines (an out-of-service / retired engine can't accrue hours).
 */
export function toNavigationEngineOptions(
  t: (key: string) => string,
  engines: Pick<BoatShowEngine, 'id' | 'brand' | 'model' | 'serialNumber' | 'status'>[]
): NavigationLogEngineOption[] {
  return engines
    .filter((e) => !INACTIVE_ENGINE_STATUSES.includes(e.status))
    .map((e) => ({ id: e.id, label: engineLabel(t, e) }))
}
