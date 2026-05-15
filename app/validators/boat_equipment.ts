import vine from '@vinejs/vine'
import { engineFuels, engineKinds, rigTypes, sailTypes } from '#validators/boat'
import type { BoatEnginePayload, BoatRigPayload, BoatSailPayload } from '#services/boat_service'

export const equipmentStatuses = ['operational', 'in_maintenance', 'out_of_service', 'retired'] as const
export type EquipmentStatus = (typeof equipmentStatuses)[number]

const fuelChoices = [...engineFuels, '', '__none__'] as string[]

const enginePayload = vine.object({
  kind: vine.enum(engineKinds),
  fuel: vine.string().trim().maxLength(32).in(fuelChoices).optional(),
  brand: vine.string().trim().maxLength(120).optional(),
  model: vine.string().trim().maxLength(120).optional(),
  serialNumber: vine.string().trim().maxLength(120).optional(),
  manufacturedAt: vine.string().trim().optional(),
  powerHp: vine.string().trim().optional(),
  hours: vine.string().trim().optional(),
  status: vine.enum(equipmentStatuses).optional(),
})

export const storeBoatEngineValidator = vine.compile(enginePayload)

export const updateBoatEngineValidator = vine.compile(enginePayload)

export type BoatEngineFormBody = {
  kind: string
  fuel?: string
  brand?: string
  model?: string
  serialNumber?: string
  manufacturedAt?: string
  powerHp?: string
  hours?: string
  status?: string
}

const sailPayload = vine.object({
  sailType: vine.enum(sailTypes),
  manufacturedAt: vine.string().trim().optional(),
  areaM2: vine.string().trim().optional(),
  material: vine.string().trim().maxLength(120).optional(),
  reefPoints: vine.string().trim().optional(),
  status: vine.enum(equipmentStatuses).optional(),
})

export const storeBoatSailValidator = vine.compile(sailPayload)

export const updateBoatSailValidator = vine.compile(sailPayload)

export type BoatSailFormBody = {
  sailType: string
  manufacturedAt?: string
  areaM2?: string
  material?: string
  reefPoints?: string
  status?: string
}

const rigPayload = vine.object({
  rigType: vine.enum(rigTypes),
  manufacturedAt: vine.string().trim().optional(),
  mastCount: vine.string().trim().optional(),
  spreaders: vine.string().trim().optional(),
  status: vine.enum(equipmentStatuses).optional(),
})

export const upsertBoatRigValidator = vine.compile(rigPayload)

export type BoatRigFormBody = {
  rigType: string
  manufacturedAt?: string
  mastCount?: string
  spreaders?: string
  status?: string
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

  return {
    kind: body.kind,
    fuel,
    brand: emptyToNull(body.brand),
    model: emptyToNull(body.model),
    serialNumber: emptyToNull(body.serialNumber),
    manufacturedAt: emptyToNull(body.manufacturedAt),
    powerHp: parseOptionalPositiveFloat(body.powerHp),
    hours: parseOptionalNonNegativeInt(body.hours),
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
  }
}

export function equipmentBodyToRigPayload(body: BoatRigFormBody): BoatRigPayload {
  return {
    rigType: body.rigType,
    manufacturedAt: emptyToNull(body.manufacturedAt),
    mastCount: parseOptionalNonNegativeInt(body.mastCount),
    spreaders: parseOptionalNonNegativeInt(body.spreaders),
    status: (body.status ?? 'operational') as EquipmentStatus,
  }
}
