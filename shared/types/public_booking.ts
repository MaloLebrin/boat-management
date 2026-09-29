import type { ReservationQuote } from '#shared/helpers/reservation_quote'
import type { BrandingEmailParams } from '#shared/types/branding'

/**
 * Page publique de réservation (#881) : ce que voit le client final du loueur,
 * sans compte. Aucune donnée personnelle — ni nom de client, ni notes : les
 * créneaux occupés n'ont que des dates.
 */

/** Plage de jours occupée, `[startsOn, endsOn[` à l'heure de Paris (`YYYY-MM-DD`). */
export interface PublicBusyRange {
  startsOn: string
  endsOn: string
}

/** En-tête de la page : l'organisation, habillée de sa marque blanche si le plan le permet. */
export interface PublicBookingOrganization {
  slug: string
  name: string
  /** Logo de la marque blanche (#881) — `null` hors plan Entreprise ou sans logo. */
  logoUrl: string | null
}

/** Tarif affiché sur la page : de quoi lire « à partir de ». */
export interface PublicBookingPricing {
  currency: string
  dailyPrice: number
  weeklyPrice: number | null
  depositAmount: number | null
  minDays: number | null
  maxDays: number | null
}

/** Carte d'un bateau sur la page flotte. */
export interface PublicBookingBoatCard {
  slug: string
  name: string
  type: string | null
  lengthM: number | null
  maxPersons: number | null
  homePort: string | null
  photoUrl: string | null
  pricing: PublicBookingPricing | null
}

/** Fiche d'un bateau sur sa page de réservation. */
export interface PublicBookingBoat extends PublicBookingBoatCard {
  manufacturer: string | null
  model: string | null
  yearBuilt: number | null
  photos: string[]
}

/** Dates sélectionnées sur la page (arrivée / départ, `YYYY-MM-DD`). */
export interface PublicBookingSelection {
  startsOn: string
  endsOn: string
}

/**
 * Devis de la sélection, calculé côté serveur. `unavailable` : la sélection
 * chevauche un jour occupé ; `invalid` : dates incohérentes ou passées.
 */
export interface PublicBookingQuote {
  selection: PublicBookingSelection
  state: 'ok' | 'unavailable' | 'invalid'
  quote: ReservationQuote | null
}

/** Payload validé de `POST /book/:orgSlug/:boatSlug/request`. */
export interface PublicBookingRequestPayload {
  startsOn: string
  endsOn: string
  name: string
  email: string
  phone?: string | null
  message?: string | null
  locale: string
}

/** Réglage de la page publique d'un bateau, sur son onglet Réservations. */
export interface BoatPublicBookingSettings {
  enabled: boolean
  /** Adresse complète de la page — `null` tant qu'elle n'a jamais été ouverte. */
  url: string | null
  /** Adresse de la page flotte de l'organisation. */
  fleetUrl: string
  canManage: boolean
}

/** E-mails d'une demande publique (#881) : alerte au loueur, puis messages au client. */
export type PublicBookingEmailKind = 'alert' | 'ack' | 'confirmed' | 'declined'

export interface PublicBookingEmailParams {
  kind: PublicBookingEmailKind
  to: string
  locale: string
  reservationId: number
  orgName: string
  boatName: string
  /** Arrivée et départ, `YYYY-MM-DD` à l'heure de Paris. */
  startsOn: string
  endsOn: string
  total: number | null
  currency: string
  clientName: string
  clientEmail: string
  clientPhone: string | null
  message: string | null
  /** Chemin de la réservation dans l'app — le bouton de l'alerte au loueur. */
  actionPath: string
  branding: BrandingEmailParams | null
}
