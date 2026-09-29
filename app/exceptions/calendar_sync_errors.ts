import type { ExternalCalendarError } from '#shared/types/calendar_sync'

/** Synchronisation iCal des réservations (#880). */

/** Jeton inconnu, révoqué, ou organisation sans le module réservations : 404. */
export class CalendarFeedNotFoundError extends Error {
  name = 'CalendarFeedNotFoundError'
}

export class ExternalCalendarNotFoundError extends Error {
  name = 'ExternalCalendarNotFoundError'
}

/** Plafond de calendriers externes par bateau atteint. */
export class ExternalCalendarLimitError extends Error {
  name = 'ExternalCalendarLimitError'

  constructor(readonly limit: number) {
    super(`at most ${limit} external calendars per boat`)
  }
}

/**
 * Échec d'un téléchargement ou d'une lecture de flux importé. `code` est ce
 * qui est gardé sur le calendrier et traduit à l'écran — jamais le message
 * brut, qui peut citer une adresse interne.
 */
export class ExternalCalendarSyncError extends Error {
  name = 'ExternalCalendarSyncError'

  constructor(
    readonly code: ExternalCalendarError,
    message?: string
  ) {
    super(message ?? code)
  }
}
