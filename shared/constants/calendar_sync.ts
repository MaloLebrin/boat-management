/**
 * Synchronisation iCal des réservations (#880) — bornes partagées par le
 * rendu des flux, l'import des calendriers externes et l'écran.
 */

/** Profondeur d'historique d'un flux exporté : au-delà, plus rien à bloquer. */
export const ICAL_EXPORT_PAST_DAYS = 365

/** Fuseau des dates sans fuseau (`VALUE=DATE`, heures « flottantes ») d'un flux importé. */
export const ICAL_DEFAULT_TIMEZONE = 'Europe/Paris'

/** Durée de cache d'un flux exporté : les agendas le relisent de toute façon toutes les heures. */
export const ICAL_FEED_CACHE_SECONDS = 300

/** Taille maximale d'un flux importé (octets). */
export const EXTERNAL_CALENDAR_MAX_BYTES = 2 * 1024 * 1024

/** Délai maximal de téléchargement d'un flux importé (ms). */
export const EXTERNAL_CALENDAR_TIMEOUT_MS = 10_000

/** Redirections suivies au plus — chacune revérifiée contre le SSRF. */
export const EXTERNAL_CALENDAR_MAX_REDIRECTS = 3

/** Calendriers externes par bateau. */
export const EXTERNAL_CALENDARS_PER_BOAT = 10

/** Créneaux gardés par calendrier externe (les plus proches d'abord). */
export const EXTERNAL_CALENDAR_MAX_EVENTS = 2000

/** Un créneau terminé depuis plus longtemps n'est pas importé. */
export const EXTERNAL_EVENT_PAST_DAYS = 30

/** Longueur du jeton d'un flux exporté (base64url de 32 octets). */
export const CALENDAR_FEED_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

/** Codes d'erreur de synchronisation, traduits côté écran (`reservations.calendarSync.errors.*`). */
export const EXTERNAL_CALENDAR_ERRORS = [
  'unsafe_url',
  'timeout',
  'too_large',
  'http_error',
  'network',
  'invalid_ics',
] as const
