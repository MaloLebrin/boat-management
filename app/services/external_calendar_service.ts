import {
  ExternalCalendarLimitError,
  ExternalCalendarNotFoundError,
  ExternalCalendarSyncError,
} from '#exceptions/calendar_sync_errors'
import type Boat from '#models/boat'
import ExternalCalendar from '#models/external_calendar'
import ExternalCalendarEvent from '#models/external_calendar_event'
import Organization from '#models/organization'
import type User from '#models/user'
import AuditLogService from '#services/audit_log_service'
import CalendarFetcher, { assertSafeCalendarUrl } from '#services/calendar_fetcher'
import { parseIcsCalendar } from '#services/ical_service'
import QuotaService from '#services/quota_service'
import {
  ICAL_DEFAULT_TIMEZONE,
  EXTERNAL_CALENDAR_MAX_EVENTS,
  EXTERNAL_CALENDARS_PER_BOAT,
  EXTERNAL_EVENT_PAST_DAYS,
} from '#shared/constants/calendar_sync'
import type {
  AddExternalCalendarPayload,
  ExternalBlockRow,
  ExternalCalendarRow,
  ExternalCalendarSyncResult,
  ExternalConflict,
  ParsedIcsEvent,
} from '#shared/types/calendar_sync'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

/** Profondeur des créneaux importés affichés sur les calendriers. */
const BLOCKS_PAST_DAYS = 90

/**
 * Calendriers externes importés (#880) : le flux `.ics` d'une plateforme
 * (Click&Boat, Samboat, Airbnb…) bloque les dates du bateau dans FleetAi.
 *
 * Les créneaux importés vivent dans `external_calendar_events`, pas dans
 * `boat_reservations` : ils bloquent une réservation (`conflictFor`, appelé
 * par `BoatReservationService`) et s'affichent sur les calendriers, sans
 * compter dans le chiffre d'affaires, l'occupation, la facturation ni les
 * exports — la location est facturée par la plateforme.
 *
 * Synchronisation : à l'ajout, sur demande, et toutes les 30 minutes
 * (`SyncExternalCalendars`). Idempotente, par `UID` : un créneau déplacé est
 * mis à jour, un créneau disparu du flux est supprimé. Un échec garde les
 * créneaux de la dernière synchronisation réussie et note le code d'erreur.
 */
@inject()
export default class ExternalCalendarService {
  constructor(
    private fetcher: CalendarFetcher,
    private auditLogService: AuditLogService,
    private quotaService: QuotaService
  ) {}

  listForBoat(boatId: number): Promise<ExternalCalendar[]> {
    return ExternalCalendar.query().where('boatId', boatId).orderBy('createdAt', 'asc')
  }

  async findForBoat(boat: Boat, calendarId: number): Promise<ExternalCalendar> {
    const calendar = await ExternalCalendar.query()
      .where('id', calendarId)
      .where('boatId', boat.id)
      .where('organizationId', boat.organizationId)
      .first()
    if (!calendar) throw new ExternalCalendarNotFoundError()
    return calendar
  }

  toRow(calendar: ExternalCalendar): ExternalCalendarRow {
    let host = ''
    try {
      host = new URL(calendar.url).hostname
    } catch {
      // URL validée à l'ajout : ne devrait pas arriver.
    }
    return {
      id: calendar.id,
      name: calendar.name,
      host,
      lastSyncedAt: calendar.lastSyncedAt?.toISO() ?? null,
      lastError: calendar.lastError,
      eventCount: calendar.eventCount,
      conflictCount: calendar.conflictCount,
    }
  }

  /**
   * Ajoute un flux puis le synchronise aussitôt. L'URL est contrôlée avant
   * l'enregistrement (`unsafe_url`) ; un échec de téléchargement, lui, garde
   * le calendrier avec son erreur — la plateforme peut être en panne.
   */
  async add(
    user: User,
    boat: Boat,
    payload: AddExternalCalendarPayload
  ): Promise<{ calendar: ExternalCalendar; result: ExternalCalendarSyncResult }> {
    const url = assertSafeCalendarUrl(payload.url)

    const [{ total }] = await ExternalCalendar.query()
      .where('boatId', boat.id)
      .count('* as total')
      .pojo<{ total: string | number }>()
    if (Number(total) >= EXTERNAL_CALENDARS_PER_BOAT) {
      throw new ExternalCalendarLimitError(EXTERNAL_CALENDARS_PER_BOAT)
    }

    const calendar = await ExternalCalendar.create({
      organizationId: boat.organizationId,
      boatId: boat.id,
      name: payload.name.trim(),
      url: url.toString(),
      createdByUserId: user.id,
    })
    await this.auditLogService.log({
      organizationId: boat.organizationId,
      userId: user.id,
      action: 'external_calendar.added',
      entityType: 'external_calendar',
      entityId: calendar.id,
      metadata: { boatName: boat.name, name: calendar.name, host: url.hostname },
    })

    return { calendar, result: await this.sync(calendar) }
  }

  async remove(user: User, boat: Boat, calendarId: number): Promise<void> {
    const calendar = await this.findForBoat(boat, calendarId)
    await calendar.delete()
    await this.auditLogService.log({
      organizationId: boat.organizationId,
      userId: user.id,
      action: 'external_calendar.removed',
      entityType: 'external_calendar',
      entityId: calendar.id,
      metadata: { boatName: boat.name, name: calendar.name },
    })
  }

  async sync(calendar: ExternalCalendar): Promise<ExternalCalendarSyncResult> {
    let parsed: ParsedIcsEvent[]
    try {
      parsed = parseIcsCalendar(await this.fetcher.fetch(calendar.url))
    } catch (error) {
      const code = error instanceof ExternalCalendarSyncError ? error.code : 'network'
      logger.warn({ calendarId: calendar.id, code, err: error }, 'external calendar sync failed')
      calendar.lastError = code
      await calendar.save()
      return {
        ok: false,
        error: code,
        eventCount: calendar.eventCount,
        conflictCount: calendar.conflictCount,
      }
    }

    const events = selectEvents(parsed)
    await db.transaction(async (trx) => {
      await this.replaceEvents(calendar, events, trx)
    })

    const conflictCount = await this.countConflicts(calendar.id)
    calendar.merge({
      lastSyncedAt: DateTime.now(),
      lastError: null,
      eventCount: events.length,
      conflictCount,
    })
    await calendar.save()
    return { ok: true, error: null, eventCount: events.length, conflictCount }
  }

  /**
   * Synchronise tous les flux (job planifié). Une organisation qui n'a plus
   * le module réservations n'est plus relue : ses créneaux restent en l'état.
   */
  async syncAll(): Promise<{ synced: number; failed: number; skipped: number }> {
    const calendars = await ExternalCalendar.query().orderBy('id', 'asc')
    const allowed = new Map<number, boolean>()
    const stats = { synced: 0, failed: 0, skipped: 0 }

    for (const calendar of calendars) {
      if (!allowed.has(calendar.organizationId)) {
        const organization = await Organization.find(calendar.organizationId)
        allowed.set(
          calendar.organizationId,
          organization !== null && (await this.quotaService.canManageReservations(organization))
        )
      }
      if (!allowed.get(calendar.organizationId)) {
        stats.skipped++
        continue
      }
      const result = await this.sync(calendar)
      if (result.ok) stats.synced++
      else stats.failed++
    }
    return stats
  }

  /** Créneaux importés des bateaux, pour les calendriers de l'écran. */
  async blocksForBoats(boatIds: number[]): Promise<ExternalBlockRow[]> {
    if (boatIds.length === 0) return []
    const events = await ExternalCalendarEvent.query()
      .whereIn('boatId', boatIds)
      .where('endsAt', '>=', DateTime.now().minus({ days: BLOCKS_PAST_DAYS }).toISO()!)
      .preload('calendar', (query) => query.select(['id', 'name']))
      .orderBy('startsAt', 'asc')
      .select(['id', 'externalCalendarId', 'boatId', 'summary', 'startsAt', 'endsAt'])

    return events.map((event) => ({
      id: event.id,
      boatId: event.boatId,
      calendarName: event.calendar.name,
      summary: event.summary,
      startsAt: event.startsAt.toUTC().toISO()!,
      endsAt: event.endsAt.toUTC().toISO()!,
      ...occupiedDays(event.startsAt, event.endsAt),
    }))
  }

  /** Premier créneau importé qui chevauche `[startsAt, endsAt[` sur le bateau. */
  async conflictFor(
    boatId: number,
    startsAt: DateTime,
    endsAt: DateTime,
    trx?: TransactionClientContract
  ): Promise<ExternalConflict | null> {
    const event = await ExternalCalendarEvent.query({ client: trx })
      .where('boatId', boatId)
      .where('startsAt', '<', endsAt.toISO()!)
      .where('endsAt', '>', startsAt.toISO()!)
      .preload('calendar', (query) => query.select(['id', 'name']))
      .orderBy('startsAt', 'asc')
      .first()
    if (!event) return null
    return {
      calendarName: event.calendar.name,
      startsAt: event.startsAt.toUTC().toISO()!,
      endsAt: event.endsAt.toUTC().toISO()!,
    }
  }

  private async replaceEvents(
    calendar: ExternalCalendar,
    events: ParsedIcsEvent[],
    trx: TransactionClientContract
  ): Promise<void> {
    const existing = await ExternalCalendarEvent.query({ client: trx }).where(
      'externalCalendarId',
      calendar.id
    )
    const byUid = new Map(existing.map((event) => [event.uid, event]))
    const kept = new Set<string>()

    for (const event of events) {
      kept.add(event.uid)
      const startsAt = DateTime.fromISO(event.startsAt)
      const endsAt = DateTime.fromISO(event.endsAt)
      const row = byUid.get(event.uid)
      if (!row) {
        await ExternalCalendarEvent.create(
          {
            externalCalendarId: calendar.id,
            boatId: calendar.boatId,
            uid: event.uid,
            summary: event.summary,
            startsAt,
            endsAt,
          },
          { client: trx }
        )
        continue
      }
      if (
        row.summary !== event.summary ||
        row.startsAt.toMillis() !== startsAt.toMillis() ||
        row.endsAt.toMillis() !== endsAt.toMillis()
      ) {
        row.merge({ summary: event.summary, startsAt, endsAt })
        await row.useTransaction(trx).save()
      }
    }

    const gone = existing.filter((event) => !kept.has(event.uid)).map((event) => event.id)
    if (gone.length > 0) {
      await ExternalCalendarEvent.query({ client: trx }).whereIn('id', gone).delete()
    }
  }

  /** Créneaux importés qui chevauchent une réservation FleetAi active : une double réservation. */
  private async countConflicts(calendarId: number): Promise<number> {
    const [row] = await db
      .from('external_calendar_events as e')
      .join('boat_reservations as r', (join) => {
        join
          .on('r.boat_id', 'e.boat_id')
          .andOn('r.starts_at', '<', 'e.ends_at')
          .andOn('r.ends_at', '>', 'e.starts_at')
      })
      .where('e.external_calendar_id', calendarId)
      .whereNot('r.status', 'cancelled')
      .countDistinct('e.id as total')
    return Number(row?.total ?? 0)
  }
}

/**
 * Jours occupés par un créneau, à l'heure de Paris : une journée entière
 * importée (minuit → minuit) ne déborde pas sur la veille, comme elle le
 * ferait en découpant la date UTC.
 */
export function occupiedDays(startsAt: DateTime, endsAt: DateTime) {
  const start = startsAt.setZone(ICAL_DEFAULT_TIMEZONE)
  const end = endsAt.setZone(ICAL_DEFAULT_TIMEZONE)
  const endDay = end.startOf('day')
  const endsOn = end.equals(endDay) ? endDay : endDay.plus({ days: 1 })
  return { startsOn: start.toISODate()!, endsOn: endsOn.toISODate()! }
}

/**
 * Créneaux retenus d'un flux : pas ceux terminés depuis plus de
 * `EXTERNAL_EVENT_PAST_DAYS`, un seul par `UID`, au plus
 * `EXTERNAL_CALENDAR_MAX_EVENTS` (les plus proches d'abord).
 */
export function selectEvents(events: ParsedIcsEvent[], now: DateTime = DateTime.now()) {
  const threshold = now.minus({ days: EXTERNAL_EVENT_PAST_DAYS }).toMillis()
  const seen = new Set<string>()
  return events
    .filter((event) => Date.parse(event.endsAt) >= threshold)
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
    .filter((event) => {
      if (seen.has(event.uid)) return false
      seen.add(event.uid)
      return true
    })
    .slice(0, EXTERNAL_CALENDAR_MAX_EVENTS)
}
