/** Form row types aligned with Vine validators / API payloads (string fields for HTML inputs). */

export type EngineKind = 'inboard' | 'outboard' | 'electric' | 'hybrid' | 'other'
export type EngineFuel = 'diesel' | 'essence' | 'electric' | 'other' | ''

export type EngineFormRow = {
  kind: EngineKind
  fuel: EngineFuel
  brand: string
  model: string
  serialNumber: string
  powerHp: string
  hours: string
}

export type SailType = 'main' | 'genoa' | 'jib' | 'spinnaker' | 'gennaker' | 'storm_jib' | 'other'

export type SailFormRow = {
  sailType: SailType
  areaM2: string
  material: string
  reefPoints: string
}

export type RigType = 'sloop' | 'cutter' | 'ketch' | 'yawl' | 'schooner' | 'cat_rig' | 'other'

export type RigFormRow = {
  rigType: RigType
  mastCount: string
  spreaders: string
}

export type PropulsionTypeUi = 'sailboat' | 'motorboat' | 'catamaran' | 'rib' | 'other' | ''

/** Server shape for edit page (Inertia props). */
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
  engines: Array<{
    id: number
    kind: string
    fuel: string | null
    brand: string | null
    model: string | null
    serialNumber: string | null
    manufacturedAt: string | null
    powerHp: number | null
    hours: number | null
  }>
  sails: Array<{
    id: number
    sailType: string
    manufacturedAt: string | null
    areaM2: number | null
    material: string | null
    reefPoints: number | null
  }>
  rig: {
    id: number
    rigType: string
    manufacturedAt: string | null
    mastCount: number | null
    spreaders: number | null
  } | null
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
