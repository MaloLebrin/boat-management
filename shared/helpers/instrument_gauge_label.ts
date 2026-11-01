import type { BoatBatteryRow, BoatTankRow } from '#shared/types/boat'

/**
 * Resolves the FleetAi name for a battery or tank gauge based on instrumentKey.
 *
 * Battery paths: `electrical.batteries.<id>.voltage` => key = `<id>` (e.g., `house`)
 * Tank paths: `tanks.<type>.<id>.currentLevel` => key = `<type>.<id>` (e.g., `fuel.0`)
 *
 * Returns the FleetAi name if a matching equipment is found, otherwise `null`.
 */

/** Extract battery key from Signal K path. */
export function extractBatteryKey(path: string): string | null {
  const match = path.match(/^electrical\.batteries\.([^.]+)\./)
  return match?.[1] ?? null
}

/** Extract tank key from Signal K path. */
export function extractTankKey(path: string): string | null {
  const match = path.match(/^tanks\.([^.]+\.[^.]+)\./)
  return match?.[1] ?? null
}

/** Find battery name by instrumentKey. */
export function findBatteryName(
  batteries: readonly BoatBatteryRow[],
  instrumentKey: string
): string | null {
  const battery = batteries.find((b) => b.instrumentKey === instrumentKey)
  return battery?.name ?? null
}

/** Find tank name by instrumentKey. */
export function findTankName(tanks: readonly BoatTankRow[], instrumentKey: string): string | null {
  const tank = tanks.find((t) => t.instrumentKey === instrumentKey)
  return tank?.name ?? null
}

/**
 * Resolve the display label for a gauge instance.
 * Replaces the raw Signal K identifier with the FleetAi equipment name when available.
 */
export function resolveGaugeInstanceLabel(
  path: string,
  rawInstance: string,
  batteries: readonly BoatBatteryRow[],
  tanks: readonly BoatTankRow[]
): string {
  const batteryKey = extractBatteryKey(path)
  if (batteryKey) {
    const name = findBatteryName(batteries, batteryKey)
    if (name) return name
  }

  const tankKey = extractTankKey(path)
  if (tankKey) {
    const name = findTankName(tanks, tankKey)
    if (name) return name
  }

  return rawInstance
}
