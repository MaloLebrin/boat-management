import type { InstrumentDevice, InstrumentDeviceGroup } from '#shared/types/instruments'

/** Ordre d'affichage des rubriques de l'encart « Ce que la boîte a trouvé » (#1036). */
export const INSTRUMENT_DEVICE_GROUPS: readonly InstrumentDeviceGroup[] = [
  'engine',
  'battery',
  'tank',
  'gps',
  'ais',
  'weather',
  'other',
]

const PATH_GROUPS: ReadonlyArray<[prefix: string, group: InstrumentDeviceGroup]> = [
  ['propulsion.', 'engine'],
  ['electrical.', 'battery'],
  ['tanks.', 'tank'],
  ['navigation.position', 'gps'],
  ['navigation.speedOverGround', 'gps'],
  ['navigation.courseOverGround', 'gps'],
  ['environment.', 'weather'],
]

const FUNCTION_GROUPS: ReadonlyArray<[keyword: string, group: InstrumentDeviceGroup]> = [
  ['engine', 'engine'],
  ['propulsion', 'engine'],
  ['battery', 'battery'],
  ['charger', 'battery'],
  ['tank', 'tank'],
  ['fluid', 'tank'],
  ['gps', 'gps'],
  ['gnss', 'gps'],
  ['ais', 'ais'],
  ['weather', 'weather'],
  ['wind', 'weather'],
]

/**
 * Rubrique d'un appareil : d'abord ce qu'il fournit (les chemins sont fiables),
 * puis sa fonction NMEA 2000 annoncée (texte libre, mots-clés en minuscules).
 */
export function instrumentDeviceGroup(
  device: Pick<InstrumentDevice, 'paths' | 'function'>
): InstrumentDeviceGroup {
  if (device.paths.some((path) => path.startsWith('ais.') || path.includes('.ais.'))) return 'ais'
  for (const [prefix, group] of PATH_GROUPS) {
    if (device.paths.some((path) => path.startsWith(prefix))) return group
  }
  const fn = device.function?.toLowerCase() ?? ''
  for (const [keyword, group] of FUNCTION_GROUPS) {
    if (fn.includes(keyword)) return group
  }
  return 'other'
}

export function groupInstrumentDevices(
  devices: readonly InstrumentDevice[]
): Array<{ group: InstrumentDeviceGroup; devices: InstrumentDevice[] }> {
  return INSTRUMENT_DEVICE_GROUPS.map((group) => ({
    group,
    devices: devices.filter((device) => instrumentDeviceGroup(device) === group),
  })).filter((entry) => entry.devices.length > 0)
}

export type InstrumentSeenUnit = 'now' | 'minutes' | 'hours' | 'days'

/** Ancienneté arrondie vers le bas, pour « vu il y a … ». */
export function instrumentSeenAgo(
  iso: string,
  now: number
): { unit: InstrumentSeenUnit; count: number } {
  const minutes = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000))
  if (minutes < 1) return { unit: 'now', count: 0 }
  if (minutes < 60) return { unit: 'minutes', count: minutes }
  if (minutes < 60 * 24) return { unit: 'hours', count: Math.floor(minutes / 60) }
  return { unit: 'days', count: Math.floor(minutes / (60 * 24)) }
}
