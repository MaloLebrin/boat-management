import vine from '@vinejs/vine'
import { CONTACT_FLEET_SIZES, CONTACT_SUBJECTS } from '#shared/types/contact'

/**
 * Miroir exact des champs rendus par
 * `inertia/components/marketing/contact/ContactFormSection.vue` (#450).
 * Tout champ ajouté ici doit être rendu par ce formulaire, sinon son erreur
 * est invisible et l'envoi échoue silencieusement.
 */
export const contactMessageValidator = vine.create({
  subject: vine.enum(CONTACT_SUBJECTS),
  firstName: vine.string().trim().minLength(1).maxLength(100),
  lastName: vine.string().trim().minLength(1).maxLength(100),
  email: vine.string().trim().email().maxLength(254).normalizeEmail(),
  organization: vine.string().trim().maxLength(255).nullable().optional(),
  fleetSize: vine.enum(CONTACT_FLEET_SIZES).nullable().optional(),
  message: vine.string().trim().minLength(10).maxLength(5000),
  consent: vine.accepted(),
  locale: vine.string().trim().maxLength(10).optional(),
})
