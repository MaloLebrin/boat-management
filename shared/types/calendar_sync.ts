import type { EXTERNAL_CALENDAR_ERRORS } from '#shared/constants/calendar_sync'

/** Synchronisation iCal des réservations (#880). */

export type ExternalCalendarError = (typeof EXTERNAL_CALENDAR_ERRORS)[number]

/** `VEVENT` lu dans un flux importé, ramené à un créneau UTC. */
export interface ParsedIcsEvent {
  uid: string
  summary: string | null
  /** ISO UTC. */
  startsAt: string
  /** ISO UTC, exclusif. */
  endsAt: string
}

/** `VEVENT` d'un flux exporté. Dates au format ISO UTC ou `YYYY-MM-DD` (journée entière). */
export interface IcsEventInput {
  uid: string
  summary: string
  description?: string | null
  url?: string | null
  start: { date: string } | { dateTime: string }
  end: { date: string } | { dateTime: string }
  status: 'CONFIRMED' | 'TENTATIVE'
  sequence: number
  /** ISO UTC. */
  lastModified: string | null
}

export interface IcsCalendarInput {
  name: string
  /** ISO UTC — `DTSTAMP` de chaque événement. */
  generatedAt: string
  events: IcsEventInput[]
}

export interface CalendarFeedOptions {
  includeClientName: boolean
  includeMaintenance: boolean
}

/** Flux exporté tel que l'écran l'affiche — l'URL porte le jeton. */
export interface CalendarFeedRow extends CalendarFeedOptions {
  id: number
  boatId: number | null
  /** `https://…/calendar/<jeton>.ics` */
  url: string
  /** Même URL en `webcal://`, pour l'abonnement en un clic. */
  webcalUrl: string
  createdAt: string
}

/** Calendrier externe importé sur un bateau. */
export interface ExternalCalendarRow {
  id: number
  name: string
  /** Hôte seul : l'URL complète porte souvent le jeton de la plateforme. */
  host: string
  lastSyncedAt: string | null
  lastError: ExternalCalendarError | null
  eventCount: number
  /** Créneaux importés qui chevauchent une réservation FleetAi (double réservation). */
  conflictCount: number
}

/** Créneau importé, affiché sur le calendrier, non modifiable dans FleetAi. */
export interface ExternalBlockRow {
  id: number
  boatId: number
  calendarName: string
  summary: string | null
  /** ISO UTC. */
  startsAt: string
  /** ISO UTC, exclusif. */
  endsAt: string
  /** Premier jour occupé, `YYYY-MM-DD` à l'heure de Paris — ce que les calendriers découpent. */
  startsOn: string
  /** Lendemain du dernier jour occupé, `YYYY-MM-DD` (exclusif). */
  endsOn: string
}

/** Encart « Synchroniser avec un calendrier externe » d'un bateau. */
export interface BoatCalendarSyncProps {
  feed: CalendarFeedRow | null
  externalCalendars: ExternalCalendarRow[]
  canManage: boolean
}

export interface AddExternalCalendarPayload {
  name: string
  url: string
}

export interface ExternalCalendarSyncResult {
  ok: boolean
  error: ExternalCalendarError | null
  eventCount: number
  conflictCount: number
}

/** Créneau importé qui bloque une réservation. */
export interface ExternalConflict {
  calendarName: string
  startsAt: string
  endsAt: string
}
