import vine from '@vinejs/vine'
import { ACCEPTED_CLIENT_PERMIT_TYPES } from '#shared/types/client'

export const createClientValidator = vine.create(
  vine.object({
    firstName: vine.string().trim().minLength(1).maxLength(100),
    lastName: vine.string().trim().minLength(1).maxLength(100),
    email: vine.string().trim().email().maxLength(255).nullable().optional(),
    phone: vine.string().trim().maxLength(50).nullable().optional(),
    address: vine.string().trim().maxLength(1000).nullable().optional(),
    navigationPermitNumber: vine.string().trim().maxLength(100).nullable().optional(),
    // Vocabulaire partagé avec les certifications d'équipage (#585) — les
    // anciennes valeurs restent acceptées pour ne pas invalider les fiches
    // déjà saisies.
    navigationPermitType: vine.enum(ACCEPTED_CLIENT_PERMIT_TYPES).nullable().optional(),
    status: vine.enum(['active', 'inactive', 'blacklisted'] as const).optional(),
    notes: vine.string().trim().maxLength(5000).nullable().optional(),
    gdprConsent: vine.boolean().optional(),
  })
)

export const updateClientValidator = vine.create(
  vine.object({
    firstName: vine.string().trim().minLength(1).maxLength(100),
    lastName: vine.string().trim().minLength(1).maxLength(100),
    email: vine.string().trim().email().maxLength(255).nullable().optional(),
    phone: vine.string().trim().maxLength(50).nullable().optional(),
    address: vine.string().trim().maxLength(1000).nullable().optional(),
    navigationPermitNumber: vine.string().trim().maxLength(100).nullable().optional(),
    // Vocabulaire partagé avec les certifications d'équipage (#585) — les
    // anciennes valeurs restent acceptées pour ne pas invalider les fiches
    // déjà saisies.
    navigationPermitType: vine.enum(ACCEPTED_CLIENT_PERMIT_TYPES).nullable().optional(),
    status: vine.enum(['active', 'inactive', 'blacklisted'] as const).optional(),
    notes: vine.string().trim().maxLength(5000).nullable().optional(),
    gdprConsent: vine.boolean().optional(),
  })
)
