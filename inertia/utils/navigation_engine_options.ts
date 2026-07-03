import type { BoatShowEngine, NavigationLogEngineOption } from '~/types/boat_show'

/** Engine statuses that make an engine unavailable for hour tracking. */
const INACTIVE_ENGINE_STATUSES = ['out_of_service', 'retired']

function engineLabel(engine: Pick<BoatShowEngine, 'id' | 'brand' | 'model'>): string {
  const label = [engine.brand, engine.model].filter(Boolean).join(' ').trim()
  return label || `#${engine.id}`
}

/**
 * Maps a boat's engines to selectable options for the trip-close form, keeping
 * only active engines (an out-of-service / retired engine can't accrue hours).
 */
export function toNavigationEngineOptions(
  engines: Pick<BoatShowEngine, 'id' | 'brand' | 'model' | 'status'>[]
): NavigationLogEngineOption[] {
  return engines
    .filter((e) => !INACTIVE_ENGINE_STATUSES.includes(e.status))
    .map((e) => ({ id: e.id, label: engineLabel(e) }))
}
