import vine from '@vinejs/vine'
import {
  PUBLIC_BOOKING_HONEYPOT_FIELD,
  PUBLIC_BOOKING_MESSAGE_MAX,
  PUBLIC_BOOKING_NAME_MAX,
} from '#shared/constants/public_booking'

const DAY = /^\d{4}-\d{2}-\d{2}$/

/**
 * Demande de la page publique de réservation (#881). Miroir des champs de
 * `inertia/components/public_booking/PublicBookingRequestForm.vue`. Les dates
 * ne sont vérifiées ici que dans leur forme : leur place dans le calendrier
 * (fenêtre réservable, jours occupés) est l'affaire du service.
 *
 * Le champ piège est accepté vide ou absent ; rempli, la demande est ignorée
 * par le contrôleur sans erreur visible — un robot n'apprend rien.
 */
export const publicBookingRequestValidator = vine.create({
  startsOn: vine.string().trim().regex(DAY),
  endsOn: vine.string().trim().regex(DAY),
  name: vine.string().trim().minLength(2).maxLength(PUBLIC_BOOKING_NAME_MAX),
  email: vine.string().trim().email().maxLength(254).normalizeEmail(),
  phone: vine.string().trim().maxLength(40).nullable().optional(),
  message: vine.string().trim().maxLength(PUBLIC_BOOKING_MESSAGE_MAX).nullable().optional(),
  consent: vine.accepted(),
  locale: vine.string().trim().maxLength(10).optional(),
  [PUBLIC_BOOKING_HONEYPOT_FIELD]: vine.string().nullable().optional(),
})

/** Ouverture / fermeture de la page d'un bateau, depuis son onglet Réservations. */
export const publicBookingSettingsValidator = vine.create({
  enabled: vine.boolean(),
})
