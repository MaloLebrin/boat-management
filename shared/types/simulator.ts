export const SIMULATOR_BOAT_TYPES = ['motorboat', 'sailboat', 'catamaran', 'rib'] as const
export type SimulatorBoatType = (typeof SIMULATOR_BOAT_TYPES)[number]

export const SIMULATOR_WEAR_LEVELS = ['new', 'good', 'worn', 'to_replace'] as const
export type SimulatorWearLevel = (typeof SIMULATOR_WEAR_LEVELS)[number]

export const SIMULATOR_WINTERING_ZONES = ['covered', 'outdoor', 'sea'] as const
export type SimulatorWinteringZone = (typeof SIMULATOR_WINTERING_ZONES)[number]

export interface SimulatorBoatInput {
  boatType: SimulatorBoatType
  lengthM: number
  yearBuilt: number
  navigationCategory: 'A' | 'B' | 'C' | 'D'
  hasDedicatedEngine: boolean
  hullWear: SimulatorWearLevel
  engineWear: SimulatorWearLevel | null
  safetyWear: SimulatorWearLevel
  riggingWear: SimulatorWearLevel | null
  winteringZone?: SimulatorWinteringZone
}

export interface SimulatorCostCategory {
  key: string
  minCost: number
  maxCost: number
}

export interface SimulatorCostBreakdown {
  categories: SimulatorCostCategory[]
  totalMin: number
  totalMax: number
}

export interface SimulatorLeadPayload {
  email: string
  boatType: SimulatorBoatType
  lengthM: number
  hullWear?: SimulatorWearLevel | null
  engineWear?: SimulatorWearLevel | null
  safetyWear?: SimulatorWearLevel | null
  riggingWear?: SimulatorWearLevel | null
  winteringZone?: SimulatorWinteringZone | null
  totalMin: number
  totalMax: number
  locale?: string
}

export interface SimulatorBenchmarkEntry {
  avgMin: number
  avgMax: number
  count: number
}

/**
 * Map des benchmarks par type de bateau et tranche de longueur.
 * Clé : `${boatType}:${lengthBracket}` ex: "sailboat:9-12"
 * Brackets : '<6', '6-9', '9-12', '12-15', '15+'
 */
export type SimulatorBenchmarkMap = Record<string, SimulatorBenchmarkEntry>

export interface SimulatorSharePayload {
  input: SimulatorBoatInput
  breakdown: SimulatorCostBreakdown
  locale?: string
}
