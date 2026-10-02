import vine from '@vinejs/vine'
import {
  OWNER_REQUEST_DESCRIPTION_MAX,
  OWNER_REQUEST_TITLE_MAX,
} from '#shared/constants/owner_portal'

/** Demande du propriétaire depuis son portail (#890). */
export const createOwnerRequestValidator = vine.create({
  title: vine.string().trim().minLength(3).maxLength(OWNER_REQUEST_TITLE_MAX),
  description: vine.string().trim().maxLength(OWNER_REQUEST_DESCRIPTION_MAX).nullable().optional(),
})
