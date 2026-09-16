import { BoatNotFoundError } from '#exceptions/boat_errors'
import type Boat from '#models/boat'
import type User from '#models/user'
import { DateTime } from 'luxon'

export function toDateOrNull(value: Date | string | DateTime | null | undefined): DateTime | null {
  if (value === null || value === undefined) return null
  if (DateTime.isDateTime(value)) return value
  if (value instanceof Date) return DateTime.fromJSDate(value)
  return DateTime.fromISO(String(value))
}

export function toDecimalStringOrNull(value: number | null | undefined): string | null {
  if (value === null || value === undefined) return null
  return value.toFixed(2)
}

/**
 * Garde de périmètre : le bateau doit appartenir à l'organisation de
 * l'utilisateur. Un bateau étranger est traité comme inexistant.
 *
 * Chaque domaine lève l'erreur « introuvable » de sa propre ressource
 * (réservation, incident, fiche d'entretien…) pour que le handler global la
 * traduise dans le bon message ; `makeError` permet de la choisir sans copier
 * la condition. Par défaut : `BoatNotFoundError`.
 */
export function assertBoatInUserOrg(
  user: User,
  boat: Boat,
  makeError: () => Error = () => new BoatNotFoundError()
): void {
  if (user.organizationId === null || user.organizationId !== boat.organizationId) {
    throw makeError()
  }
}
