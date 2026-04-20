/** Form row types and hull-only edit payload (engines / sails / rig are managed on the boat detail page). */

export type EngineKind = 'inboard' | 'outboard' | 'electric' | 'hybrid' | 'other'
export type EngineFuel = 'diesel' | 'essence' | 'electric' | 'other' | ''

export type SailType = 'main' | 'genoa' | 'jib' | 'spinnaker' | 'gennaker' | 'storm_jib' | 'other'

export type RigType = 'sloop' | 'cutter' | 'ketch' | 'yawl' | 'schooner' | 'cat_rig' | 'other'

export type PropulsionTypeUi = 'sailboat' | 'motorboat' | 'catamaran' | 'rib' | 'other' | ''

/** Server shape for hull-only edit page (Inertia props). */
export type BoatEditPayload = {
  id: number
  name: string
  registrationNumber: string | null
  type: string | null
  manufacturedAt: string | null
  propulsionType: string | null
  lengthM: number | null
  beamM: number | null
  draftM: number | null
  mastHeightM: number | null
  hullMaterial: string | null
  yearBuilt: number | null
  manufacturer: string | null
  model: string | null
}

const ENGINE_KINDS: readonly EngineKind[] = ['inboard', 'outboard', 'electric', 'hybrid', 'other']
const ENGINE_FUELS: readonly EngineFuel[] = ['diesel', 'essence', 'electric', 'other']
const SAIL_TYPES: readonly SailType[] = [
  'main',
  'genoa',
  'jib',
  'spinnaker',
  'gennaker',
  'storm_jib',
  'other',
]
const RIG_TYPES: readonly RigType[] = [
  'sloop',
  'cutter',
  'ketch',
  'yawl',
  'schooner',
  'cat_rig',
  'other',
]

export function parseEngineKind(value: string): EngineKind {
  return ENGINE_KINDS.includes(value as EngineKind) ? (value as EngineKind) : 'inboard'
}

export function parseEngineFuel(value: string | null | undefined): EngineFuel {
  if (!value) return ''
  return ENGINE_FUELS.includes(value as EngineFuel) ? (value as EngineFuel) : ''
}

export function parseSailType(value: string): SailType {
  return SAIL_TYPES.includes(value as SailType) ? (value as SailType) : 'main'
}

export function parseRigType(value: string): RigType {
  return RIG_TYPES.includes(value as RigType) ? (value as RigType) : 'sloop'
}

export function parsePropulsionType(value: string | null | undefined): PropulsionTypeUi {
  if (!value) return ''
  const allowed: PropulsionTypeUi[] = ['sailboat', 'motorboat', 'catamaran', 'rib', 'other']
  return allowed.includes(value as PropulsionTypeUi) ? (value as PropulsionTypeUi) : ''
}
