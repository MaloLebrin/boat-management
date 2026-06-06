import type {
  SimulatorBoatInput,
  SimulatorCostBreakdown,
  SimulatorCostCategory,
  SimulatorWearLevel,
} from '../../shared/types/simulator'

interface CostRange {
  min: number
  max: number
}

interface LengthCosts {
  hull: CostRange
  engine: CostRange
  safety: CostRange
  electrical: CostRange
  mooring: CostRange
}

const COSTS_BY_LENGTH: { maxLength: number; costs: LengthCosts }[] = [
  {
    maxLength: 6,
    costs: {
      hull: { min: 250, max: 350 },
      engine: { min: 300, max: 400 },
      safety: { min: 120, max: 180 },
      electrical: { min: 100, max: 150 },
      mooring: { min: 60, max: 100 },
    },
  },
  {
    maxLength: 9,
    costs: {
      hull: { min: 500, max: 700 },
      engine: { min: 450, max: 650 },
      safety: { min: 180, max: 250 },
      electrical: { min: 150, max: 220 },
      mooring: { min: 100, max: 150 },
    },
  },
  {
    maxLength: 12,
    costs: {
      hull: { min: 900, max: 1300 },
      engine: { min: 700, max: 900 },
      safety: { min: 250, max: 350 },
      electrical: { min: 200, max: 300 },
      mooring: { min: 150, max: 220 },
    },
  },
  {
    maxLength: 15,
    costs: {
      hull: { min: 1500, max: 2100 },
      engine: { min: 1000, max: 1400 },
      safety: { min: 350, max: 500 },
      electrical: { min: 300, max: 400 },
      mooring: { min: 200, max: 280 },
    },
  },
  {
    maxLength: Infinity,
    costs: {
      hull: { min: 2500, max: 3500 },
      engine: { min: 1600, max: 2000 },
      safety: { min: 450, max: 600 },
      electrical: { min: 450, max: 550 },
      mooring: { min: 250, max: 350 },
    },
  },
]

const RIGGING_COSTS_BY_LENGTH: { maxLength: number; costs: CostRange }[] = [
  { maxLength: 6, costs: { min: 300, max: 500 } },
  { maxLength: 9, costs: { min: 500, max: 900 } },
  { maxLength: 12, costs: { min: 800, max: 1400 } },
  { maxLength: 15, costs: { min: 1200, max: 1800 } },
  { maxLength: Infinity, costs: { min: 1800, max: 2500 } },
]

const WEAR_MULTIPLIERS: Record<SimulatorWearLevel, number> = {
  new: 0.5,
  good: 1.0,
  worn: 1.5,
  to_replace: 2.5,
}

function getCostsForLength(lengthM: number): LengthCosts {
  const entry = COSTS_BY_LENGTH.find((e) => lengthM < e.maxLength)
  return entry?.costs ?? COSTS_BY_LENGTH[COSTS_BY_LENGTH.length - 1].costs
}

function getRiggingCostsForLength(lengthM: number): CostRange {
  const entry = RIGGING_COSTS_BY_LENGTH.find((e) => lengthM < e.maxLength)
  return entry?.costs ?? RIGGING_COSTS_BY_LENGTH[RIGGING_COSTS_BY_LENGTH.length - 1].costs
}

function applyCostMultiplier(base: CostRange, wear: SimulatorWearLevel): CostRange {
  const multiplier = WEAR_MULTIPLIERS[wear]
  return {
    min: Math.round(base.min * multiplier),
    max: Math.round(base.max * multiplier),
  }
}

export function computeSimulatorCosts(input: SimulatorBoatInput): SimulatorCostBreakdown {
  const baseCosts = getCostsForLength(input.lengthM)
  const categories: SimulatorCostCategory[] = []

  // Hull
  const hullCost = applyCostMultiplier(baseCosts.hull, input.hullWear)
  categories.push({
    key: 'hull',
    minCost: hullCost.min,
    maxCost: hullCost.max,
  })

  // Engine (only if hasDedicatedEngine or motorboat/rib)
  const hasEngine =
    input.hasDedicatedEngine || input.boatType === 'motorboat' || input.boatType === 'rib'
  if (hasEngine && input.engineWear) {
    const engineCost = applyCostMultiplier(baseCosts.engine, input.engineWear)
    categories.push({
      key: 'engine',
      minCost: engineCost.min,
      maxCost: engineCost.max,
    })
  }

  // Safety (always)
  const safetyCost = applyCostMultiplier(baseCosts.safety, input.safetyWear)
  categories.push({
    key: 'safety',
    minCost: safetyCost.min,
    maxCost: safetyCost.max,
  })

  // Electrical (based on average of hull and safety wear for simplicity)
  const electricalWear = input.hullWear
  const electricalCost = applyCostMultiplier(baseCosts.electrical, electricalWear)
  categories.push({
    key: 'electrical',
    minCost: electricalCost.min,
    maxCost: electricalCost.max,
  })

  // Mooring (based on hull wear)
  const mooringCost = applyCostMultiplier(baseCosts.mooring, input.hullWear)
  categories.push({
    key: 'mooring',
    minCost: mooringCost.min,
    maxCost: mooringCost.max,
  })

  // Rigging (only for sailboats and catamarans)
  const hasSails = input.boatType === 'sailboat' || input.boatType === 'catamaran'
  if (hasSails && input.riggingWear) {
    const riggingBase = getRiggingCostsForLength(input.lengthM)
    const riggingCost = applyCostMultiplier(riggingBase, input.riggingWear)
    categories.push({
      key: 'rigging',
      minCost: riggingCost.min,
      maxCost: riggingCost.max,
    })
  }

  // Compute totals
  const totalMin = categories.reduce((sum, cat) => sum + cat.minCost, 0)
  const totalMax = categories.reduce((sum, cat) => sum + cat.maxCost, 0)

  return {
    categories,
    totalMin,
    totalMax,
  }
}
