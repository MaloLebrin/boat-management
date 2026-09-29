import { CalendarFeedNotFoundError } from '#exceptions/calendar_sync_errors'
import Boat from '#models/boat'
import BoatReservation from '#models/boat_reservation'
import CalendarFeed from '#models/calendar_feed'
import Organization from '#models/organization'
import type User from '#models/user'
import AuditLogService from '#services/audit_log_service'
import { renderIcsCalendar } from '#services/ical_service'
import PlanningService from '#services/planning_service'
import QuotaService from '#services/quota_service'
import { ICAL_EXPORT_PAST_DAYS } from '#shared/constants/calendar_sync'
import { toAppLocale } from '#shared/helpers/locale_path'
import type {
  CalendarFeedOptions,
  CalendarFeedRow,
  IcsEventInput,
} from '#shared/types/calendar_sync'
import env from '#start/env'
import { inject } from '@adonisjs/core'
import i18nManager from '@adonisjs/i18n/services/main'
import { DateTime } from 'luxon'
import { randomBytes } from 'node:crypto'

/**
 * Flux iCal exportés (#880) : un par bateau, un pour la flotte, publiés sous
 * `/calendar/<jeton>.ics` sans session.
 *
 * Le jeton (32 octets aléatoires) est le seul secret de l'URL, comme l'«
 * adresse secrète » d'un agenda Google : il est gardé en clair pour que
 * l'écran puisse réafficher l'URL. Le régénérer révoque l'ancienne.
 *
 * Contenu : réservations `confirmed` (`STATUS:CONFIRMED`) et `option`
 * (`STATUS:TENTATIVE`) de l'année écoulée et à venir — une annulation
 * disparaît du flux, ce qui la retire des agendas abonnés. Le nom du client
 * n'y figure que si l'option est cochée ; les créneaux importés d'autres
 * plateformes n'y figurent jamais (ils y reviendraient en écho).
 */
@inject()
export default class CalendarFeedService {
  constructor(
    private auditLogService: AuditLogService,
    private planningService: PlanningService,
    private quotaService: QuotaService
  ) {}

  async feedFor(organizationId: number, boatId: number | null): Promise<CalendarFeed | null> {
    const query = CalendarFeed.query().where('organizationId', organizationId)
    if (boatId === null) query.whereNull('boatId')
    else query.where('boatId', boatId)
    return query.first()
  }

  /** Crée le flux, ou le régénère : l'ancien jeton cesse aussitôt de répondre. */
  async regenerate(
    user: User,
    organizationId: number,
    boat: Boat | null,
    options: CalendarFeedOptions
  ): Promise<CalendarFeed> {
    const previous = await this.feedFor(organizationId, boat?.id ?? null)
    if (previous) await this.revokeFeed(user, previous)

    const feed = await CalendarFeed.create({
      organizationId,
      boatId: boat?.id ?? null,
      token: randomBytes(32).toString('base64url'),
      locale: toAppLocale(user.locale),
      includeClientName: options.includeClientName,
      includeMaintenance: options.includeMaintenance,
      createdByUserId: user.id,
    })
    await this.auditLogService.log({
      organizationId,
      userId: user.id,
      action: 'calendar.token_created',
      entityType: 'calendar_feed',
      entityId: feed.id,
      metadata: { scope: boat ? 'boat' : 'fleet', boatName: boat?.name ?? null, ...options },
    })
    return feed
  }

  /** Change le contenu du flux sans toucher à son URL. */
  async updateOptions(feed: CalendarFeed, options: CalendarFeedOptions): Promise<CalendarFeed> {
    feed.merge(options)
    await feed.save()
    return feed
  }

  async revoke(user: User, organizationId: number, boat: Boat | null): Promise<boolean> {
    const feed = await this.feedFor(organizationId, boat?.id ?? null)
    if (!feed) return false
    await this.revokeFeed(user, feed)
    return true
  }

  private async revokeFeed(user: User, feed: CalendarFeed): Promise<void> {
    await feed.delete()
    await this.auditLogService.log({
      organizationId: feed.organizationId,
      userId: user.id,
      action: 'calendar.token_revoked',
      entityType: 'calendar_feed',
      entityId: feed.id,
      metadata: { scope: feed.boatId === null ? 'fleet' : 'boat', boatId: feed.boatId },
    })
  }

  toRow(feed: CalendarFeed): CalendarFeedRow {
    const url = `${env.get('APP_URL').replace(/\/$/, '')}/calendar/${feed.token}.ics`
    return {
      id: feed.id,
      boatId: feed.boatId,
      url,
      webcalUrl: url.replace(/^https?:\/\//, 'webcal://'),
      includeClientName: feed.includeClientName,
      includeMaintenance: feed.includeMaintenance,
      createdAt: feed.createdAt.toISO()!,
    }
  }

  /**
   * Corps du flux d'un jeton. `CalendarFeedNotFoundError` (→ 404) pour un
   * jeton inconnu ou révoqué, et pour une organisation qui n'a plus le module
   * réservations : le flux s'éteint avec l'abonnement.
   */
  async renderByToken(token: string): Promise<string> {
    const feed = await CalendarFeed.findBy('token', token)
    if (!feed) throw new CalendarFeedNotFoundError()

    const organization = await Organization.find(feed.organizationId)
    if (!organization || !(await this.quotaService.canManageReservations(organization))) {
      throw new CalendarFeedNotFoundError()
    }

    const boats = await Boat.query()
      .where('organizationId', feed.organizationId)
      .if(feed.boatId !== null, (query) => query.where('id', feed.boatId!))
      .select(['id', 'name'])
    if (feed.boatId !== null && boats.length === 0) throw new CalendarFeedNotFoundError()

    const i18n = i18nManager.locale(feed.locale)
    const boatNames = new Map(boats.map((boat) => [boat.id, boat.name]))
    const events = await this.reservationEvents(feed, boatNames, i18n)
    if (feed.includeMaintenance) {
      events.push(...(await this.maintenanceEvents(boatNames, i18n)))
    }

    const name =
      feed.boatId !== null
        ? i18n.t('reservations.calendarSync.feed.boatCalendarName', {
            boat: boatNames.get(feed.boatId) ?? '',
          })
        : i18n.t('reservations.calendarSync.feed.fleetCalendarName', { org: organization.name })

    return renderIcsCalendar({ name, generatedAt: DateTime.utc().toISO()!, events })
  }

  private async reservationEvents(
    feed: CalendarFeed,
    boatNames: Map<number, string>,
    i18n: ReturnType<typeof i18nManager.locale>
  ): Promise<IcsEventInput[]> {
    const reservations = await BoatReservation.query()
      .where('organizationId', feed.organizationId)
      .whereIn('boatId', [...boatNames.keys()])
      .whereIn('status', ['option', 'confirmed'])
      .where('endsAt', '>=', DateTime.now().minus({ days: ICAL_EXPORT_PAST_DAYS }).toISO()!)
      .orderBy('startsAt', 'asc')
      .select([
        'id',
        'boatId',
        'status',
        'startsAt',
        'endsAt',
        'clientName',
        'icalSequence',
        'updatedAt',
      ])

    const host = uidDomain()
    const appUrl = env.get('APP_URL').replace(/\/$/, '')
    return reservations.map((reservation) => {
      const boat = boatNames.get(reservation.boatId) ?? ''
      const label = feed.includeClientName
        ? reservation.clientName
        : i18n.t(`reservations.calendarSync.feed.${reservation.status}`)
      return {
        uid: `reservation-${reservation.id}@${host}`,
        summary: `${boat} — ${label}`,
        url: `${appUrl}/boats/${reservation.boatId}/reservations`,
        start: { dateTime: reservation.startsAt.toUTC().toISO()! },
        end: { dateTime: reservation.endsAt.toUTC().toISO()! },
        status: reservation.status === 'confirmed' ? 'CONFIRMED' : 'TENTATIVE',
        sequence: reservation.icalSequence,
        lastModified: reservation.updatedAt?.toUTC().toISO() ?? null,
      }
    })
  }

  /** Tâches de maintenance datées (#869), en journées entières. */
  private async maintenanceEvents(
    boatNames: Map<number, string>,
    i18n: ReturnType<typeof i18nManager.locale>
  ): Promise<IcsEventInput[]> {
    const windows = await this.planningService.maintenanceWindowsForBoats([...boatNames.keys()])
    const host = uidDomain()
    const events: IcsEventInput[] = []
    for (const [boatId, list] of windows) {
      for (const window of list) {
        events.push({
          uid: `maintenance-task-${window.taskId}@${host}`,
          summary: `${boatNames.get(boatId) ?? ''} — ${i18n.t(
            'reservations.calendarSync.feed.maintenance',
            { title: window.title }
          )}`,
          start: { date: window.startsOn },
          end: { date: window.endsOn },
          status: 'CONFIRMED',
          sequence: 0,
          lastModified: null,
        })
      }
    }
    return events
  }
}

/** Domaine des `UID` : l'hôte de l'application, stable d'un rendu à l'autre. */
function uidDomain(): string {
  try {
    return new URL(env.get('APP_URL')).hostname
  } catch {
    return 'fleetai'
  }
}
