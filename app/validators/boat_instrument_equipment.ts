import vine from '@vinejs/vine'
import {
  BATTERY_CHEMISTRIES,
  BATTERY_KEY_PATTERN,
  INSTRUMENT_KEY_MAX_LENGTH,
  TANK_KEY_PATTERN,
  TANK_TYPES,
} from '#shared/constants/tanks'

/**
 * Batteries et réservoirs (#1037). Les champs facultatifs numériques sont
 * `nullable` : le formulaire Inertia envoie une chaîne vide, que VineJS
 * convertit en `null` avant la validation du type.
 */
const batteryPayload = vine.object({
  name: vine.string().trim().minLength(1).maxLength(120),
  chemistry: vine.enum(BATTERY_CHEMISTRIES).nullable().optional(),
  capacityAh: vine.number().positive().max(100000).withoutDecimals().nullable().optional(),
  nominalVoltage: vine.number().positive().max(1000).nullable().optional(),
  lowVoltageV: vine.number().positive().max(1000).nullable().optional(),
  instrumentKey: vine
    .string()
    .trim()
    .maxLength(INSTRUMENT_KEY_MAX_LENGTH)
    .regex(BATTERY_KEY_PATTERN)
    .nullable()
    .optional(),
})

const tankPayload = vine.object({
  name: vine.string().trim().minLength(1).maxLength(120),
  type: vine.enum(TANK_TYPES),
  capacityL: vine.number().positive().max(1000000).withoutDecimals().nullable().optional(),
  lowLevelPct: vine.number().min(1).max(99).withoutDecimals().nullable().optional(),
  instrumentKey: vine
    .string()
    .trim()
    .maxLength(INSTRUMENT_KEY_MAX_LENGTH)
    .regex(TANK_KEY_PATTERN)
    .nullable()
    .optional(),
})

export const boatBatteryValidator = vine.create(batteryPayload)
export const boatTankValidator = vine.create(tankPayload)

export const batteryInstrumentKeyValidator = vine.create(
  vine.object({
    instrumentKey: vine
      .string()
      .trim()
      .maxLength(INSTRUMENT_KEY_MAX_LENGTH)
      .regex(BATTERY_KEY_PATTERN)
      .nullable()
      .optional(),
  })
)

export const tankInstrumentKeyValidator = vine.create(
  vine.object({
    instrumentKey: vine
      .string()
      .trim()
      .maxLength(INSTRUMENT_KEY_MAX_LENGTH)
      .regex(TANK_KEY_PATTERN)
      .nullable()
      .optional(),
  })
)

/** Corps de `POST …/instrument-mapping/apply` : les propositions cochées. */
export const instrumentMappingApplyValidator = vine.create(
  vine.object({
    items: vine
      .array(
        vine.object({
          kind: vine.enum(['engine', 'battery', 'tank'] as const),
          instrumentKey: vine.string().trim().minLength(1).maxLength(INSTRUMENT_KEY_MAX_LENGTH),
          name: vine.string().trim().minLength(1).maxLength(120),
          existingId: vine.number().withoutDecimals().positive().nullable(),
          tankType: vine.string().trim().maxLength(24).nullable(),
        })
      )
      .minLength(1)
      .maxLength(40),
  })
)
