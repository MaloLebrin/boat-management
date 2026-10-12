import Boat from '#models/boat'
import BoatDocument from '#models/boat_document'
import BoatIncident from '#models/boat_incident'
import BoatMaintenanceEvent from '#models/boat_maintenance_event'
import BoatMaintenanceTask from '#models/boat_maintenance_task'
import BoatReservation from '#models/boat_reservation'
import BoatSafetyEquipment from '#models/boat_safety_equipment'
import Invoice from '#models/invoice'
import Organization from '#models/organization'
import OrganizationMembership from '#models/organization_membership'
import { BrandingService } from '#services/branding_service'
import EmailQueueService from '#services/email_queue_service'
import FleetReportingService from '#services/fleet_reporting_service'
import NotificationPreferenceService from '#services/notification_preference_service'
import QuotaService from '#services/quota_service'
import { DEMO_ORG_SLUG } from '#shared/constants/demo'
import {
  FLEET_DIGEST_EXPIRY_DAYS,
  FLEET_DIGEST_ITEMS_PER_SECTION,
  FLEET_DIGEST_UPCOMING_DAYS,
  fleetDigestEnabled,
  isFleetDigestEligible,
  isMonthlyReportEmpty,
  isWeeklyDigestEmpty,
  previousMonth,
  scopeWeeklyDigest,
  weeklyDigestWindow,
} from '#shared/helpers/fleet_digest'
import { REPORT_COST_CATEGORIES, type ReportBoatOption } from '#shared/types/reporting'
import type {
  FleetDigestExpiry,
  FleetDigestKind,
  FleetDigestList,
  FleetDigestOrganization,
  FleetDigestRecipient,
  FleetDigestTask,
  MonthlyFleetReport,
  WeeklyFleetDigest,
} from '#shared/types/fleet_digest'
import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import { DateTime } from 'luxon'

const LIMIT = FLEET_DIGEST_ITEMS_PER_SECTION

function isoDate(value: DateTime | null): string {
  return value?.toISODate() ?? ''
}

/**
 * Rapports de flotte par e-mail (#871). Assemble, une fois par organisation,
 * la synthèse hebdomadaire et le rapport mensuel en objets typés
 * (`shared/types/fleet_digest.ts`), puis les met en file pour chaque
 * destinataire : la vue est taillée à son rôle et une synthèse vide ne part
 * pas. Le rendu (e-mail, PDF) vit dans `FleetDigestMailService`.
 *
 * Toutes les lectures sont bornées aux bateaux actifs de l'organisation : un
 * bateau en corbeille (#858) ne remonte nulle part.
 */
@inject()
export default class FleetDigestService {
  constructor(
    private reportingService: FleetReportingService,
    private quotaService: QuotaService,
    private brandingService: BrandingService,
    private preferenceService: NotificationPreferenceService,
    private emailQueue: EmailQueueService
  ) {}

  // ---------------------------------------------------------------------------
  // Envoi
  // ---------------------------------------------------------------------------

  /** Lundi : la synthèse de chaque organisation, à chacun de ses destinataires. */
  async sendWeekly(now = DateTime.now()): Promise<number> {
    let sent = 0
    for (const org of await this.activeOrganizations()) {
      try {
        sent += await this.sendWeeklyFor(org, now)
      } catch (error) {
        logger.error({ err: error, organizationId: org.id }, 'Weekly fleet digest failed')
      }
    }
    return sent
  }

  /** La synthèse d'une organisation, taillée au rôle de chaque destinataire. */
  async sendWeeklyFor(org: Organization, now = DateTime.now()): Promise<number> {
    const recipients = await this.recipients(org.id, 'weekly')
    if (recipients.length === 0) return 0
    const digest = await this.buildWeekly(org, now)
    const branding = this.brandingService.toEmailParams(org)
    let sent = 0
    for (const recipient of recipients) {
      const scoped = scopeWeeklyDigest(digest, recipient.role)
      if (isWeeklyDigestEmpty(scoped)) continue
      await this.emailQueue.sendWeeklyFleetDigest({
        digest: scoped,
        to: recipient.email,
        name: recipient.fullName,
        locale: recipient.locale,
        branding,
        unsubscribeUrl: this.unsubscribeUrl(recipient.userId, 'weekly'),
      })
      sent++
    }
    return sent
  }

  /**
   * Le 1er du mois : le rapport du mois écoulé, PDF joint. Réservé aux plans
   * qui ouvrent `/reports` (#887) — c'en est la version « push ».
   */
  async sendMonthly(now = DateTime.now()): Promise<number> {
    let sent = 0
    for (const org of await this.activeOrganizations()) {
      try {
        sent += await this.sendMonthlyFor(org, now)
      } catch (error) {
        logger.error({ err: error, organizationId: org.id }, 'Monthly fleet report failed')
      }
    }
    return sent
  }

  /** Le rapport d'une organisation ; 0 si son plan ne l'ouvre pas ou si le mois est vide. */
  async sendMonthlyFor(org: Organization, now = DateTime.now()): Promise<number> {
    if (!this.quotaService.canViewReports(org)) return 0
    const recipients = await this.recipients(org.id, 'monthly')
    if (recipients.length === 0) return 0
    const report = await this.buildMonthly(org, now)
    if (isMonthlyReportEmpty(report)) return 0
    let sent = 0
    for (const recipient of recipients) {
      const result = await this.emailQueue.sendMonthlyFleetReport({
        report,
        userId: recipient.userId,
        to: recipient.email,
        name: recipient.fullName,
        locale: recipient.locale,
      })
      if (result.enqueued) sent++
    }
    return sent
  }

  /** Désinscription en un clic d'un rapport (jeton signé, sans session). */
  unsubscribeUrl(userId: number, kind: FleetDigestKind): string {
    const token = this.preferenceService.fleetDigestUnsubscribeToken(userId, kind)
    return `${env.get('APP_URL')}/reports/digest/unsubscribe/${token}`
  }

  /** Organisations servies : ni la démo, ni celles dont la suppression est demandée (#886). */
  async activeOrganizations(): Promise<Organization[]> {
    return Organization.query()
      .whereNull('deletionRequestedAt')
      .whereNot('slug', DEMO_ORG_SLUG)
      .orderBy('id', 'asc')
  }

  /** Membres qui reçoivent le rapport : rôle éligible, compte actif, préférence effective. */
  async recipients(organizationId: number, kind: FleetDigestKind): Promise<FleetDigestRecipient[]> {
    const memberships = await OrganizationMembership.query()
      .where('organizationId', organizationId)
      .preload('user', (query) =>
        query.select(
          'id',
          'email',
          'fullName',
          'locale',
          'anonymizedAt',
          'weeklyDigestEmail',
          'monthlyReportEmail'
        )
      )
    return memberships
      .filter((m) => isFleetDigestEligible(kind, m.role) && m.user.anonymizedAt === null)
      .filter((m) =>
        fleetDigestEnabled(
          kind,
          m.role,
          kind === 'weekly' ? m.user.weeklyDigestEmail : m.user.monthlyReportEmail
        )
      )
      .map((m) => ({
        userId: m.userId,
        role: m.role,
        email: m.user.email,
        fullName: m.user.fullName,
        locale: m.user.locale,
      }))
  }

  // ---------------------------------------------------------------------------
  // Synthèse hebdomadaire
  // ---------------------------------------------------------------------------

  async buildWeekly(org: Organization, now = DateTime.now()): Promise<WeeklyFleetDigest> {
    const today = now.setZone('Europe/Paris').toISODate()!
    const window = weeklyDigestWindow(today)
    const boats = await this.#boats(org.id)
    const boatIds = boats.map((b) => b.id)
    const boatName = this.#boatNamer(boats)

    const [charter, invoicing] = await Promise.all([
      this.quotaService.canManageReservations(org),
      this.quotaService.canManageInvoices(org),
    ])
    const upcomingUntil = DateTime.fromISO(today)
      .plus({ days: FLEET_DIGEST_UPCOMING_DAYS })
      .toISODate()!

    const [overdueTasks, upcomingTasks, openIncidents, expiring, reservations, report, invoices] =
      await Promise.all([
        this.#tasks(boatIds, boatName, { until: today }),
        this.#tasks(boatIds, boatName, { from: today, to: upcomingUntil }),
        this.#incidents(org.id, boatIds, boatName),
        this.#expiring(boatIds, boatName, today),
        charter ? this.#reservations(org.id, boatIds, boatName, window.upcoming) : null,
        this.reportingService.getReport(
          org.id,
          boats,
          { preset: 'custom', from: window.past.from, to: window.past.to },
          now
        ),
        invoicing ? this.#overdueInvoices(org.id, today) : null,
      ])

    return {
      organization: this.#organization(org),
      week: window.week,
      upcoming: window.upcoming,
      past: window.past,
      overdueTasks,
      upcomingTasks,
      openIncidents,
      expiring,
      reservations,
      expenses: report.totals.costs,
      overdueInvoices: invoices,
    }
  }

  /** Tâches ouvertes à échéance datée : avant `until` (exclu), ou de `from` à `to` (inclus). */
  async #tasks(
    boatIds: number[],
    boatName: (id: number) => string,
    range: { until: string } | { from: string; to: string }
  ): Promise<FleetDigestList<FleetDigestTask>> {
    if (boatIds.length === 0) return { total: 0, items: [] }
    const base = () => {
      const query = BoatMaintenanceTask.query()
        .whereIn('boatId', boatIds)
        .where('status', 'open')
        .whereNotNull('dueAt')
      return 'until' in range
        ? query.where('dueAt', '<', range.until)
        : query.where('dueAt', '>=', range.from).where('dueAt', '<=', range.to)
    }
    const [count, rows] = await Promise.all([
      base().count('* as row_count'),
      base()
        .select('id', 'title', 'boatId', 'dueAt')
        .orderBy('dueAt', 'asc')
        .orderBy('id', 'asc')
        .limit(LIMIT),
    ])
    return {
      total: Number(count[0]?.$extras.row_count ?? 0),
      items: rows.map((task) => ({
        id: task.id,
        title: task.title,
        boatId: task.boatId,
        boatName: boatName(task.boatId),
        dueAt: isoDate(task.dueAt),
      })),
    }
  }

  async #incidents(
    organizationId: number,
    boatIds: number[],
    boatName: (id: number) => string
  ): Promise<WeeklyFleetDigest['openIncidents']> {
    if (boatIds.length === 0) return { total: 0, items: [] }
    const base = () =>
      BoatIncident.query()
        .where('organizationId', organizationId)
        .whereIn('boatId', boatIds)
        .whereIn('status', ['open', 'in_progress'])
    const [count, rows] = await Promise.all([
      base().count('* as row_count'),
      base()
        .select('id', 'boatId', 'type', 'status', 'occurredAt')
        .orderBy('occurredAt', 'asc')
        .orderBy('id', 'asc')
        .limit(LIMIT),
    ])
    return {
      total: Number(count[0]?.$extras.row_count ?? 0),
      items: rows.map((incident) => ({
        id: incident.id,
        boatId: incident.boatId,
        boatName: boatName(incident.boatId),
        type: incident.type,
        status: incident.status as 'open' | 'in_progress',
        occurredAt: isoDate(incident.occurredAt),
      })),
    }
  }

  /**
   * Documents et équipements de sécurité expirés ou qui expirent sous
   * {@link FLEET_DIGEST_EXPIRY_DAYS} jours, fusionnés par date d'échéance.
   */
  async #expiring(
    boatIds: number[],
    boatName: (id: number) => string,
    today: string
  ): Promise<FleetDigestList<FleetDigestExpiry>> {
    if (boatIds.length === 0) return { total: 0, items: [] }
    const horizon = DateTime.fromISO(today).plus({ days: FLEET_DIGEST_EXPIRY_DAYS }).toISODate()!
    const documents = () =>
      BoatDocument.query()
        .whereIn('boatId', boatIds)
        .whereNotNull('expiresAt')
        .where('expiresAt', '<=', horizon)
    const equipment = () =>
      BoatSafetyEquipment.query()
        .whereIn('boatId', boatIds)
        .whereNotNull('expiryDate')
        .where('expiryDate', '<=', horizon)

    const [docCount, docRows, equipmentCount, equipmentRows] = await Promise.all([
      documents().count('* as row_count'),
      documents()
        .select('id', 'boatId', 'type', 'customTypeLabel', 'expiresAt')
        .orderBy('expiresAt', 'asc')
        .orderBy('id', 'asc')
        .limit(LIMIT),
      equipment().count('* as row_count'),
      equipment()
        .select('id', 'boatId', 'equipmentType', 'expiryDate')
        .orderBy('expiryDate', 'asc')
        .orderBy('id', 'asc')
        .limit(LIMIT),
    ])

    const items: FleetDigestExpiry[] = [
      ...docRows.map((doc) => ({
        kind: 'document' as const,
        id: doc.id,
        boatId: doc.boatId,
        boatName: boatName(doc.boatId),
        type: doc.type,
        customLabel: doc.customTypeLabel,
        expiresAt: isoDate(doc.expiresAt),
        expired: isoDate(doc.expiresAt) < today,
      })),
      ...equipmentRows.map((item) => ({
        kind: 'safety_equipment' as const,
        id: item.id,
        boatId: item.boatId,
        boatName: boatName(item.boatId),
        type: item.equipmentType,
        customLabel: null,
        expiresAt: isoDate(item.expiryDate),
        expired: isoDate(item.expiryDate) < today,
      })),
    ].sort((a, b) => a.expiresAt.localeCompare(b.expiresAt) || a.id - b.id)

    return {
      total:
        Number(docCount[0]?.$extras.row_count ?? 0) +
        Number(equipmentCount[0]?.$extras.row_count ?? 0),
      items: items.slice(0, LIMIT),
    }
  }

  /** Réservations (option ou confirmées) qui chevauchent la semaine qui commence. */
  async #reservations(
    organizationId: number,
    boatIds: number[],
    boatName: (id: number) => string,
    week: { from: string; to: string }
  ): Promise<WeeklyFleetDigest['reservations']> {
    if (boatIds.length === 0) return { total: 0, items: [] }
    const until = DateTime.fromISO(week.to).plus({ days: 1 }).toISODate()!
    const base = () =>
      BoatReservation.query()
        .where('organizationId', organizationId)
        .whereIn('boatId', boatIds)
        .whereIn('status', ['option', 'confirmed'])
        .where('startsAt', '<', until)
        .where('endsAt', '>', week.from)
    const [count, rows] = await Promise.all([
      base().count('* as row_count'),
      base()
        .select('id', 'boatId', 'clientName', 'startsAt', 'endsAt', 'status')
        .orderBy('startsAt', 'asc')
        .orderBy('id', 'asc')
        .limit(LIMIT),
    ])
    return {
      total: Number(count[0]?.$extras.row_count ?? 0),
      items: rows.map((reservation) => ({
        id: reservation.id,
        boatId: reservation.boatId,
        boatName: boatName(reservation.boatId),
        clientName: reservation.clientName,
        startsAt: isoDate(reservation.startsAt),
        endsAt: isoDate(reservation.endsAt),
        status: reservation.status,
      })),
    }
  }

  /**
   * Factures impayées : statut `overdue` ou envoyée avec une échéance passée,
   * même lecture que la liste « À traiter » du tableau de bord (#832).
   */
  async #overdueInvoices(
    organizationId: number,
    today: string
  ): Promise<WeeklyFleetDigest['overdueInvoices']> {
    const base = () =>
      Invoice.query()
        .where('organizationId', organizationId)
        .where('kind', 'invoice')
        .where((q) => {
          q.where('status', 'overdue').orWhere((sent) =>
            sent.where('status', 'sent').where('dueAt', '<', today)
          )
        })
    const [count, rows] = await Promise.all([
      base().count('* as row_count'),
      base()
        .select('id', 'number', 'clientName', 'total', 'dueAt')
        .orderBy('dueAt', 'asc')
        .orderBy('id', 'asc')
        .limit(LIMIT),
    ])
    return {
      total: Number(count[0]?.$extras.row_count ?? 0),
      items: rows.map((invoice) => ({
        id: invoice.id,
        number: invoice.number,
        clientName: invoice.clientName,
        total: Number.parseFloat(invoice.total),
        dueAt: invoice.dueAt?.toISODate() ?? null,
      })),
    }
  }

  // ---------------------------------------------------------------------------
  // Rapport mensuel
  // ---------------------------------------------------------------------------

  async buildMonthly(org: Organization, now = DateTime.now()): Promise<MonthlyFleetReport> {
    const month = previousMonth(now.setZone('Europe/Paris').toISODate()!)
    const monthStart = DateTime.fromFormat(month, 'yyyy-MM', { zone: 'utc' })
    const boats = await this.#boats(org.id)
    const boatIds = boats.map((b) => b.id)

    const [report, charter, maintenance] = await Promise.all([
      this.reportingService.getReport(org.id, boats, { preset: 'month' }, monthStart),
      this.quotaService.canManageReservations(org),
      this.#maintenanceActivity(
        boatIds,
        monthStart.toISODate()!,
        monthStart.endOf('month').toISODate()!
      ),
    ])

    const topCategories = REPORT_COST_CATEGORIES.map((category) => ({
      category,
      amount: report.totals.costs[category],
    }))
      .filter((row) => row.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3)

    return {
      organization: this.#organization(org),
      month,
      period: report.period,
      costs: report.totals.costs,
      previousCosts: report.previousTotals.costs.total,
      topCategories,
      engineHours: report.totals.engineHours,
      distanceNm: report.totals.distanceNm,
      maintenance,
      rental: charter
        ? {
            revenue: report.totals.rentalRevenue,
            rentalDays: report.totals.rentalDays,
            occupancyRate: report.totals.occupancyRate,
          }
        : null,
      boats: report.boats.map((row) => ({
        boatId: row.boatId,
        boatName: row.boatName,
        costs: row.costs.total,
        engineHours: row.engineHours,
        rentalRevenue: row.rentalRevenue,
        occupancyRate: row.occupancyRate,
      })),
    }
  }

  /** Entretiens du mois : planifiés (échéance dans le mois), dont faits, et interventions saisies. */
  async #maintenanceActivity(
    boatIds: number[],
    from: string,
    to: string
  ): Promise<MonthlyFleetReport['maintenance']> {
    if (boatIds.length === 0) return { planned: 0, completed: 0, performed: 0 }
    const [planned, performed] = await Promise.all([
      db
        .from('boat_maintenance_tasks')
        .whereIn('boat_id', boatIds)
        .where('due_at', '>=', from)
        .where('due_at', '<=', to)
        .select(db.raw('count(*)::int as total'))
        .select(db.raw("count(*) filter (where status = 'done')::int as completed"))
        .first(),
      BoatMaintenanceEvent.query()
        .whereIn('boatId', boatIds)
        .where('performedAt', '>=', from)
        .where('performedAt', '<=', to)
        .count('* as row_count'),
    ])
    return {
      planned: Number(planned?.total ?? 0),
      completed: Number(planned?.completed ?? 0),
      performed: Number(performed[0]?.$extras.row_count ?? 0),
    }
  }

  // ---------------------------------------------------------------------------

  async #boats(organizationId: number): Promise<ReportBoatOption[]> {
    const boats = await Boat.query()
      .where('organizationId', organizationId)
      .select('id', 'name')
      .orderBy('name', 'asc')
    return boats.map((b) => ({ id: b.id, name: b.name }))
  }

  #boatNamer(boats: ReportBoatOption[]): (id: number) => string {
    const names = new Map(boats.map((b) => [b.id, b.name]))
    return (id) => names.get(id) ?? `#${id}`
  }

  #organization(org: Organization): FleetDigestOrganization {
    return { id: org.id, name: org.name, currency: org.currency }
  }
}
