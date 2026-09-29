import { ExternalCalendarSyncError } from '#exceptions/calendar_sync_errors'
import { ICAL_DEFAULT_TIMEZONE } from '#shared/constants/calendar_sync'
import type { IcsCalendarInput, IcsEventInput, ParsedIcsEvent } from '#shared/types/calendar_sync'
import { DateTime, Duration } from 'luxon'

/**
 * Lecture et écriture de flux iCalendar (RFC 5545) pour la synchronisation
 * des réservations (#880). Fonctions pures : ni base, ni réseau.
 *
 * Ce qui est géré, et seulement ça :
 * - écriture : `VCALENDAR` + `VEVENT` (dates UTC ou journées entières),
 *   échappement TEXT, pliage des lignes à 75 octets, fins de ligne CRLF ;
 * - lecture : dépliage, `VEVENT` de premier niveau (les `VALARM` imbriqués
 *   sont ignorés), `DTSTART`/`DTEND`/`DURATION` en date, date-heure UTC, avec
 *   `TZID` ou flottante. Les événements `CANCELLED` ou `TRANSPARENT` (temps
 *   libre) ne bloquent rien et sont écartés. Une `RRULE` n'est pas déroulée :
 *   seule la première occurrence compte — les plateformes de location
 *   publient une réservation par événement.
 */

const CRLF = '\r\n'
const MAX_LINE_OCTETS = 75

/** Échappement d'une valeur TEXT (RFC 5545 §3.3.11). */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n')
}

export function unescapeIcsText(value: string): string {
  return value.replace(/\\([\\;,nN])/g, (_, char: string) =>
    char === 'n' || char === 'N' ? '\n' : char
  )
}

/**
 * Pliage d'une ligne à 75 octets (§3.1) : la suite repart sur une ligne
 * commençant par une espace. Coupe entre deux caractères, jamais au milieu
 * d'une séquence UTF-8.
 */
export function foldIcsLine(line: string): string {
  const parts: string[] = []
  let current = ''
  let currentBytes = 0
  // Les lignes de continuation portent l'espace de tête dans leurs 75 octets.
  let limit = MAX_LINE_OCTETS

  for (const char of line) {
    const bytes = Buffer.byteLength(char, 'utf8')
    if (currentBytes + bytes > limit) {
      parts.push(current)
      current = ''
      currentBytes = 0
      limit = MAX_LINE_OCTETS - 1
    }
    current += char
    currentBytes += bytes
  }
  parts.push(current)
  return parts.join(`${CRLF} `)
}

function formatUtc(iso: string): string {
  return DateTime.fromISO(iso, { zone: 'utc' }).toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'")
}

function formatDate(isoDate: string): string {
  return isoDate.replace(/-/g, '')
}

function dateProperty(name: string, value: IcsEventInput['start']): string {
  return 'date' in value
    ? `${name};VALUE=DATE:${formatDate(value.date)}`
    : `${name}:${formatUtc(value.dateTime)}`
}

function renderEvent(event: IcsEventInput, dtstamp: string): string[] {
  const lines = [
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${dtstamp}`,
    dateProperty('DTSTART', event.start),
    dateProperty('DTEND', event.end),
    `SUMMARY:${escapeIcsText(event.summary)}`,
    `STATUS:${event.status}`,
    `SEQUENCE:${event.sequence}`,
    'TRANSP:OPAQUE',
  ]
  if (event.lastModified) lines.push(`LAST-MODIFIED:${formatUtc(event.lastModified)}`)
  if (event.description) lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`)
  if (event.url) lines.push(`URL:${event.url}`)
  lines.push('END:VEVENT')
  return lines
}

/** Flux complet, prêt à servir en `text/calendar; charset=utf-8`. */
export function renderIcsCalendar(calendar: IcsCalendarInput): string {
  const dtstamp = formatUtc(calendar.generatedAt)
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FleetAi//Reservations//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(calendar.name)}`,
    ...calendar.events.flatMap((event) => renderEvent(event, dtstamp)),
    'END:VCALENDAR',
  ]
  return lines.map(foldIcsLine).join(CRLF) + CRLF
}

interface ContentLine {
  name: string
  params: Record<string, string>
  value: string
}

/** Dépliage (§3.1) : une ligne qui commence par une espace ou une tabulation continue la précédente. */
export function unfoldIcsLines(source: string): string[] {
  const lines: string[] = []
  for (const raw of source.split(/\r\n|\n|\r/)) {
    if ((raw.startsWith(' ') || raw.startsWith('\t')) && lines.length > 0) {
      lines[lines.length - 1] += raw.slice(1)
    } else if (raw.length > 0) {
      lines.push(raw)
    }
  }
  return lines
}

/** `NOM;PARAM=valeur;PARAM="va:leur":valeur` — les deux-points entre guillemets ne séparent pas. */
function parseContentLine(line: string): ContentLine | null {
  let inQuotes = false
  let colon = -1
  // Unités UTF-16, comme les index de `slice` plus bas.
  for (const [i, char] of line.split('').entries()) {
    if (char === '"') inQuotes = !inQuotes
    else if (char === ':' && !inQuotes) {
      colon = i
      break
    }
  }
  if (colon === -1) return null

  const head = line.slice(0, colon)
  const segments = head.match(/(?:[^;"]|"[^"]*")+/g) ?? []
  const [name, ...rawParams] = segments
  if (!name) return null

  const params: Record<string, string> = {}
  for (const raw of rawParams) {
    const eq = raw.indexOf('=')
    if (eq === -1) continue
    params[raw.slice(0, eq).toUpperCase()] = raw.slice(eq + 1).replace(/^"|"$/g, '')
  }
  return { name: name.toUpperCase(), params, value: line.slice(colon + 1) }
}

function zoneOrDefault(tzid: string | undefined, fallback: string): string {
  if (!tzid) return fallback
  return DateTime.now().setZone(tzid).isValid ? tzid : fallback
}

interface ParsedDate {
  instant: DateTime
  allDay: boolean
}

/**
 * `DTSTART`/`DTEND` : journée entière (`YYYYMMDD`), UTC (`…Z`), avec `TZID`,
 * ou flottante (fuseau par défaut). Un `TZID` inconnu de l'IANA — un nom
 * Windows comme « Romance Standard Time » — retombe sur le fuseau par défaut.
 */
function parseIcsDate(line: ContentLine, defaultZone: string): ParsedDate | null {
  const value = line.value.trim()
  const zone = zoneOrDefault(line.params.TZID, defaultZone)

  if (/^\d{8}$/.test(value) || line.params.VALUE === 'DATE') {
    const date = DateTime.fromFormat(value.slice(0, 8), 'yyyyMMdd', { zone })
    return date.isValid ? { instant: date, allDay: true } : null
  }

  const match = value.match(/^(\d{8}T\d{6})(Z?)$/)
  if (!match) return null
  const instant = DateTime.fromFormat(match[1], "yyyyMMdd'T'HHmmss", {
    zone: match[2] === 'Z' ? 'utc' : zone,
  })
  return instant.isValid ? { instant, allDay: false } : null
}

/** `DURATION` (§3.3.6) : `P1W`, `P2D`, `PT3H30M`, `P1DT12H`. */
export function parseIcsDuration(value: string): Duration | null {
  const match = value
    .trim()
    .match(/^\+?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/)
  if (!match || value.trim() === 'P' || value.trim().endsWith('T')) return null
  const [, weeks, days, hours, minutes, seconds] = match.map((part) => Number(part ?? 0))
  return Duration.fromObject({ weeks, days, hours, minutes, seconds })
}

interface RawEvent {
  uid?: string
  recurrenceId?: string
  summary?: string
  status?: string
  transp?: string
  start?: ContentLine
  end?: ContentLine
  duration?: string
}

function toParsedEvent(raw: RawEvent, defaultZone: string): ParsedIcsEvent | null {
  if (raw.status?.toUpperCase() === 'CANCELLED') return null
  if (raw.transp?.toUpperCase() === 'TRANSPARENT') return null
  if (!raw.start) return null

  const start = parseIcsDate(raw.start, defaultZone)
  if (!start) return null

  let end: DateTime | null = null
  if (raw.end) {
    end = parseIcsDate(raw.end, defaultZone)?.instant ?? null
  } else if (raw.duration) {
    const duration = parseIcsDuration(raw.duration)
    end = duration ? start.instant.plus(duration) : null
  } else if (start.allDay) {
    // §3.6.1 : une journée entière sans fin dure un jour.
    end = start.instant.plus({ days: 1 })
  }
  // Sans fin, une date-heure dure zéro seconde : rien à bloquer.
  if (!end || end <= start.instant) return null

  const startsAt = start.instant.toUTC().toISO()!
  const endsAt = end.toUTC().toISO()!
  // Une occurrence modifiée (`RECURRENCE-ID`) partage l'`UID` de sa série.
  const baseUid = raw.uid?.trim() || `nouid-${startsAt}-${endsAt}`
  const uid = raw.recurrenceId ? `${baseUid}#${raw.recurrenceId}` : baseUid

  return {
    uid: uid.slice(0, 255),
    summary: raw.summary ? unescapeIcsText(raw.summary).trim().slice(0, 200) || null : null,
    startsAt,
    endsAt,
  }
}

/**
 * Créneaux bloquants d'un flux importé. Lève `invalid_ics` si le document
 * n'est pas un `VCALENDAR` — une page HTML d'erreur servie en 200, typiquement.
 */
export function parseIcsCalendar(
  source: string,
  defaultZone: string = ICAL_DEFAULT_TIMEZONE
): ParsedIcsEvent[] {
  const lines = unfoldIcsLines(source.replace(/^\uFEFF/, ''))
  if (!lines[0] || lines[0].trim().toUpperCase() !== 'BEGIN:VCALENDAR') {
    throw new ExternalCalendarSyncError('invalid_ics')
  }

  const events: ParsedIcsEvent[] = []
  const stack: string[] = []
  let current: RawEvent | null = null

  for (const text of lines) {
    const line = parseContentLine(text)
    if (!line) continue

    if (line.name === 'BEGIN') {
      const component = line.value.trim().toUpperCase()
      stack.push(component)
      if (component === 'VEVENT' && stack.length === 2) current = {}
      continue
    }
    if (line.name === 'END') {
      const component = stack.pop()
      if (component === 'VEVENT' && current && stack.length === 1) {
        const event = toParsedEvent(current, defaultZone)
        if (event) events.push(event)
        current = null
      }
      continue
    }

    // Propriétés du VEVENT lui-même, pas de ses VALARM.
    if (!current || stack[stack.length - 1] !== 'VEVENT') continue
    switch (line.name) {
      case 'UID':
        current.uid = line.value
        break
      case 'RECURRENCE-ID':
        current.recurrenceId = line.value.trim()
        break
      case 'SUMMARY':
        current.summary = line.value
        break
      case 'STATUS':
        current.status = line.value.trim()
        break
      case 'TRANSP':
        current.transp = line.value.trim()
        break
      case 'DTSTART':
        current.start = line
        break
      case 'DTEND':
        current.end = line
        break
      case 'DURATION':
        current.duration = line.value
        break
    }
  }

  return events
}
