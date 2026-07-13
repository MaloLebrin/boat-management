import vine from '@vinejs/vine'
import { engineFuels, engineKinds, rigTypes, sailTypes } from '#validators/boat'
import type { BoatEnginePayload, BoatRigPayload, BoatSailPayload } from '#shared/types/boat'

export const equipmentStatuses = [
  'operational',
  'in_maintenance',
  'out_of_service',
  'retired',
] as const
export type EquipmentStatus = (typeof equipmentStatuses)[number]

const fuelChoices = [...engineFuels, '', '__none__'] as string[]

export const engineStrokeTypes = ['2_stroke', '4_stroke'] as const
export type EngineStrokeType = (typeof engineStrokeTypes)[number]

const strokeTypeChoices = [...engineStrokeTypes, '', '__none__'] as string[]

const enginePayload = vine.object({
  kind: vine.enum(engineKinds),
  fuel: vine.string().trim().maxLength(32).in(fuelChoices).optional(),
  strokeType: vine.string().trim().in(strokeTypeChoices).optional(),
  brand: vine.string().trim().maxLength(120).optional(),
  model: vine.string().trim().maxLength(120).optional(),
  serialNumber: vine.string().trim().maxLength(120).optional(),
  manufacturedAt: vine.string().trim().optional(),
  powerHp: vine.string().trim().optional(),
  hours: vine.string().trim().optional(),
  installHours: vine.string().trim().optional(),
  status: vine.enum(equipmentStatuses).optional(),
})

export const storeBoatEngineValidator = vine.create(enginePayload)

export const updateBoatEngineValidator = vine.create(enginePayload)

export type BoatEngineFormBody = {
  kind: string
  fuel?: string
  strokeType?: string
  brand?: string
  model?: string
  serialNumber?: string
  manufacturedAt?: string
  powerHp?: string
  hours?: string
  installHours?: string
  status?: string
}

const sailPayload = vine.object({
  sailType: vine.enum(sailTypes),
  manufacturedAt: vine.string().trim().optional(),
  areaM2: vine.string().trim().optional(),
  material: vine.string().trim().maxLength(120).optional(),
  reefPoints: vine.string().trim().optional(),
  status: vine.enum(equipmentStatuses).optional(),
  notes: vine.string().trim().maxLength(5000).optional(),
  purchasePrice: vine.string().trim().optional(),
  purchasedAt: vine.string().trim().optional(),
})

export const storeBoatSailValidator = vine.create(sailPayload)

export const updateBoatSailValidator = vine.create(sailPayload)

export type BoatSailFormBody = {
  sailType: string
  manufacturedAt?: string
  areaM2?: string
  material?: string
  reefPoints?: string
  status?: string
  notes?: string
  purchasePrice?: string
  purchasedAt?: string
}

const rigPayload = vine.object({
  rigType: vine.enum(rigTypes),
  manufacturedAt: vine.string().trim().optional(),
  mastCount: vine.string().trim().optional(),
  spreaders: vine.string().trim().optional(),
  status: vine.enum(equipmentStatuses).optional(),
  notes: vine.string().trim().maxLength(5000).optional(),
})

export const upsertBoatRigValidator = vine.create(rigPayload)

export const updateEquipmentStatusValidator = vine.create(
  vine.object({ status: vine.enum(equipmentStatuses) })
)

export const updateEquipmentNotesValidator = vine.create(
  vine.object({ notes: vine.string().trim().maxLength(5000).optional().nullable() })
)

export const incrementEngineHoursValidator = vine.create(
  vine.object({ hoursIncrement: vine.number().positive() })
)

export type BoatRigFormBody = {
  rigType: string
  manufacturedAt?: string
  mastCount?: string
  spreaders?: string
  status?: string
  notes?: string
}

function parseOptionalPositiveFloat(raw: string | undefined): number | null {
  if (raw === undefined || raw.trim() === '') return null
  const n = Number.parseFloat(raw)
  if (Number.isNaN(n) || n <= 0) return null
  return n
}

function parseOptionalNonNegativeInt(raw: string | undefined): number | null {
  if (raw === undefined || raw.trim() === '') return null
  const n = Number.parseInt(raw, 10)
  if (!Number.isInteger(n) || n < 0) return null
  return n
}

function emptyToNull(s: string | undefined): string | null {
  if (s === undefined) return null
  const t = s.trim()
  return t === '' ? null : t
}

/** Normalize validated form fields to service payload (HTML sends strings). */
export function equipmentBodyToEnginePayload(body: BoatEngineFormBody): BoatEnginePayload {
  const fuel =
    body.fuel === undefined || body.fuel === '' || body.fuel === '__none__' ? null : body.fuel
  const strokeType =
    body.strokeType === undefined || body.strokeType === '' || body.strokeType === '__none__'
      ? null
      : (body.strokeType as EngineStrokeType)

  return {
    kind: body.kind,
    fuel,
    strokeType,
    brand: emptyToNull(body.brand),
    model: emptyToNull(body.model),
    serialNumber: emptyToNull(body.serialNumber),
    manufacturedAt: emptyToNull(body.manufacturedAt),
    powerHp: parseOptionalPositiveFloat(body.powerHp),
    hours: parseOptionalNonNegativeInt(body.hours),
    installHours: parseOptionalNonNegativeInt(body.installHours),
    status: (body.status ?? 'operational') as EquipmentStatus,
  }
}

export function equipmentBodyToSailPayload(body: BoatSailFormBody): BoatSailPayload {
  return {
    sailType: body.sailType,
    manufacturedAt: emptyToNull(body.manufacturedAt),
    areaM2: parseOptionalPositiveFloat(body.areaM2),
    material: emptyToNull(body.material),
    reefPoints: parseOptionalNonNegativeInt(body.reefPoints),
    status: (body.status ?? 'operational') as EquipmentStatus,
    notes: emptyToNull(body.notes),
    purchasePrice: emptyToNull(body.purchasePrice),
    purchasedAt: emptyToNull(body.purchasedAt),
  }
}

export function equipmentBodyToRigPayload(body: BoatRigFormBody): BoatRigPayload {
  return {
    rigType: body.rigType,
    manufacturedAt: emptyToNull(body.manufacturedAt),
    mastCount: parseOptionalNonNegativeInt(body.mastCount),
    spreaders: parseOptionalNonNegativeInt(body.spreaders),
    status: (body.status ?? 'operational') as EquipmentStatus,
    notes: emptyToNull(body.notes),
  }
}
