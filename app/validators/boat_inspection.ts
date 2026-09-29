import { INSPECTION_ITEM_STATES } from '#shared/types/inspection'
import vine from '@vinejs/vine'
import {
  SIGNATURE_DATA_URL_MAX_LENGTH,
  SIGNATURE_DATA_URL_PREFIX,
} from '#shared/constants/inspection_signature'

const inspectionKindChoices = ['checkout', 'checkin'] as const

export const createBoatInspectionValidator = vine.create(
  vine.object({
    kind: vine.enum(inspectionKindChoices),
    performedAt: vine.date({ formats: ['YYYY-MM-DDTHH:mm', 'YYYY-MM-DD'] }),
    // browser's getTimezoneOffset() — shifts the naive local datetime to UTC
    tzOffsetMinutes: vine.number().withoutDecimals().optional(),
    fuelLevel: vine.number().min(0).max(100).withoutDecimals().optional(),
    engineHours: vine.number().min(0).max(9999.99).optional(),
    notes: vine.string().trim().optional(),
  })
)

export const updateBoatInspectionValidator = vine.create(
  vine.object({
    // Rejeu hors-ligne (#622) : `updatedAt` connu du client au moment de la
    // saisie — le service rejette si l'inspection a bougé depuis.
    _expectedUpdatedAt: vine.string().optional(),
    performedAt: vine.date({ formats: ['YYYY-MM-DDTHH:mm', 'YYYY-MM-DD'] }).optional(),
    // browser's getTimezoneOffset() — shifts the naive local datetime to UTC
    tzOffsetMinutes: vine.number().withoutDecimals().optional(),
    fuelLevel: vine.number().min(0).max(100).withoutDecimals().optional(),
    engineHours: vine.number().min(0).max(9999.99).optional(),
    notes: vine.string().trim().optional(),
  })
)

// Constat sur un point de contrôle de la checklist (#584). La forme seule est
// validée ici (longueur alignée sur la colonne) — l'appartenance de `itemKey`
// au corpus se vérifie dans le service, comme `stepKey` côté diagnostic.
export const setBoatInspectionItemValidator = vine.create(
  vine.object({
    itemKey: vine.string().trim().maxLength(64),
    state: vine.enum(INSPECTION_ITEM_STATES),
    // Un constat non-OK sans explication n'est pas exploitable au check-in.
    note: vine
      .string()
      .trim()
      .maxLength(500)
      .optional()
      .requiredWhen('state', 'in', ['remark', 'damage']),
  })
)

export const clearBoatInspectionItemValidator = vine.create(
  vine.object({
    itemKey: vine.string().trim().maxLength(64),
  })
)

const signatureDataUrl = () =>
  vine.string().startsWith(SIGNATURE_DATA_URL_PREFIX).maxLength(SIGNATURE_DATA_URL_MAX_LENGTH)

/**
 * Signature de l'état des lieux (#889) : le nom du client et un tracé PNG par
 * partie. Le nom de l'agent est celui du compte connecté. Que les octets
 * soient bien un PNG, c'est le service qui le vérifie.
 */
export const signBoatInspectionValidator = vine.create(
  vine.object({
    clientName: vine.string().trim().minLength(2).maxLength(120),
    clientSignature: signatureDataUrl(),
    staffSignature: signatureDataUrl(),
  })
)
