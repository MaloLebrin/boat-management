import vine from '@vinejs/vine'
import { SIMULATOR_BOAT_TYPES, SIMULATOR_WEAR_LEVELS } from '#shared/types/simulator'

const currentYear = new Date().getFullYear()

export const simulatorValidator = vine.create({
  boatType: vine.enum(SIMULATOR_BOAT_TYPES),
  lengthM: vine.number().range([2, 30]),
  yearBuilt: vine.number().range([1950, currentYear]),
  navigationCategory: vine.enum(['A', 'B', 'C', 'D'] as const),
  hasDedicatedEngine: vine.boolean(),
  hullWear: vine.enum(SIMULATOR_WEAR_LEVELS),
  engineWear: vine.enum(SIMULATOR_WEAR_LEVELS).nullable(),
  safetyWear: vine.enum(SIMULATOR_WEAR_LEVELS),
  riggingWear: vine.enum(SIMULATOR_WEAR_LEVELS).nullable(),
})
