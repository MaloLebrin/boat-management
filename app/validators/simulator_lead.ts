import vine from '@vinejs/vine'
import { SIMULATOR_BOAT_TYPES, SIMULATOR_WEAR_LEVELS } from '#shared/types/simulator'

export const simulatorLeadValidator = vine.create({
  email: vine.string().email().normalizeEmail(),
  boatType: vine.enum(SIMULATOR_BOAT_TYPES),
  lengthM: vine.number().range([2, 30]),
  hullWear: vine.enum(SIMULATOR_WEAR_LEVELS).nullable(),
  engineWear: vine.enum(SIMULATOR_WEAR_LEVELS).nullable(),
  safetyWear: vine.enum(SIMULATOR_WEAR_LEVELS).nullable(),
  riggingWear: vine.enum(SIMULATOR_WEAR_LEVELS).nullable(),
  totalMin: vine.number().min(0),
  totalMax: vine.number().min(0),
  locale: vine.string().maxLength(10).optional(),
})
