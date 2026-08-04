/**
 * Formulaire de contact public (`/en/contact`, `/fr/contact`) — issue #450.
 *
 * Les sujets et tailles de flotte sont stockés en base sous leur valeur
 * canonique (anglais, stable) ; le libellé affiché vient de
 * `marketing.contact2.form_subject*` dans les deux locales.
 */

export const CONTACT_SUBJECTS = [
  'demo',
  'pricing',
  'migration',
  'technical',
  'partnership',
  'other',
] as const
export type ContactSubject = (typeof CONTACT_SUBJECTS)[number]

export const CONTACT_FLEET_SIZES = ['1-4', '5-20', '20+'] as const
export type ContactFleetSize = (typeof CONTACT_FLEET_SIZES)[number]

export interface ContactMessagePayload {
  subject: ContactSubject
  firstName: string
  lastName: string
  email: string
  organization?: string | null
  fleetSize?: ContactFleetSize | null
  message: string
  consent: true
  locale?: string
}

/** Payload validé + métadonnées serveur, tel que consommé par le service. */
export interface ContactMessageCreateInput extends ContactMessagePayload {
  ipAddress?: string | null
}

/** Option de sujet envoyée au frontend : valeur canonique + libellé traduit. */
export interface ContactSubjectOption {
  value: ContactSubject
  label: string
}
