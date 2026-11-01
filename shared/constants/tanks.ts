/**
 * Types de réservoir (#1037) — ce sont les `<type>` du catalogue Signal K
 * `tanks.<type>.<id>.currentLevel` (#988). Une cuve FleetAi porte l'un d'eux ;
 * un type hors liste n'est ni proposé au rattachement ni accepté à la saisie.
 */
export const TANK_TYPES = [
  'fuel',
  'freshWater',
  'wasteWater',
  'blackWater',
  'liveWell',
  'lubrication',
  'ballast',
  'gas',
] as const

export type TankType = (typeof TANK_TYPES)[number]

export function isTankType(value: unknown): value is TankType {
  return typeof value === 'string' && (TANK_TYPES as readonly string[]).includes(value)
}

/** Chimies de batterie proposées à la saisie (facultatif : « je ne sais pas » est permis). */
export const BATTERY_CHEMISTRIES = ['lead_acid', 'agm', 'gel', 'lithium', 'other'] as const

export type BatteryChemistry = (typeof BATTERY_CHEMISTRIES)[number]

/** `<id>` Signal K d'une batterie : un segment de chemin, sans point ni espace. */
export const BATTERY_KEY_PATTERN = /^[A-Za-z0-9_-]+$/

/** Clé d'une cuve : `<type>.<id>` (ex. `fuel.0`), comme `InstrumentProbeInventory.tankIds`. */
export const TANK_KEY_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/

export const INSTRUMENT_KEY_MAX_LENGTH = 40

/** Chemin de la tension d'une batterie, de la jauge de niveau d'une cuve (clés → chemins catalogue). */
export function batteryVoltagePath(key: string): string {
  return `electrical.batteries.${key}.voltage`
}

export function tankLevelPath(key: string): string {
  return `tanks.${key}.currentLevel`
}
