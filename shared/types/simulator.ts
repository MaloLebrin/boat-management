export const SIMULATOR_BOAT_TYPES = ['motorboat', 'sailboat', 'catamaran', 'rib'] as const
export type SimulatorBoatType = (typeof SIMULATOR_BOAT_TYPES)[number]

export const SIMULATOR_WEAR_LEVELS = ['new', 'good', 'worn', 'to_replace'] as const
export type SimulatorWearLevel = (typeof SIMULATOR_WEAR_LEVELS)[number]

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
