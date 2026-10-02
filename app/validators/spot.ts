import vine from '@vinejs/vine'
import { SPOT_KINDS, SPOT_STATUSES } from '#shared/constants/marina'

const dimension = () => vine.number().positive().max(999).nullable().optional()
const rate = () => vine.number().min(0).max(9_999_999).nullable().optional()

export const createSpotValidator = vine.create(
  vine.object({
    name: vine.string().trim().maxLength(100),
    description: vine.string().trim().maxLength(500).nullable().optional(),
    // Exploitation marina (#891) : tout est optionnel, une place peut rester un simple nom.
    lengthM: dimension(),
    beamM: dimension(),
    draftM: dimension(),
    kind: vine.enum(SPOT_KINDS).optional(),
    status: vine.enum(SPOT_STATUSES).optional(),
    dailyRate: rate(),
    monthlyRate: rate(),
    annualRate: rate(),
    notes: vine.string().trim().maxLength(2000).nullable().optional(),
  })
)

export const updateSpotValidator = createSpotValidator
