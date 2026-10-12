import { DateTime } from 'luxon'
import { emptyCostBreakdown } from './reporting.js'
import { ROLE_PERMISSIONS } from '../types/permissions.js'
import type { OrgRole } from '../types/organization.js'
import type {
  FleetDigestKind,
  MonthlyFleetReport,
  WeeklyFleetDigest,
} from '../types/fleet_digest.js'

/**
 * Rapports de flotte par e-mail (#871) : règles pures partagées par le
 * service, les jobs, l'écran de préférences et les tests.
 */

/** Lignes affichées par section ; le total, lui, est toujours exact. */
export const FLEET_DIGEST_ITEMS_PER_SECTION = 5

/** Horizon des tâches « à venir » de la synthèse hebdomadaire. */
export const FLEET_DIGEST_UPCOMING_DAYS = 7

/** Horizon des documents et équipements de sécurité qui expirent. */
export const FLEET_DIGEST_EXPIRY_DAYS = 30

/**
 * Qui peut recevoir chaque rapport. Le propriétaire a son portail (#890) ;
 * le rapport mensuel est financier, donc réservé à qui voit `/reports`.
 */
const ELIGIBLE_ROLES: Record<FleetDigestKind, readonly OrgRole[]> = {
  weekly: ['admin', 'member', 'mechanic'],
  monthly: ['admin'],
}

/** Sans choix enregistré, seuls les admins reçoivent les rapports. */
const DEFAULT_ROLES: readonly OrgRole[] = ['admin']

export function isFleetDigestEligible(kind: FleetDigestKind, role: OrgRole): boolean {
  return ELIGIBLE_ROLES[kind].includes(role)
}

/**
 * Préférence effective : le choix de l'utilisateur s'il en a fait un, sinon
 * le défaut de son rôle. Un rôle non éligible ne reçoit jamais le rapport,
 * quel que soit le choix enregistré.
 */
export function fleetDigestEnabled(
  kind: FleetDigestKind,
  role: OrgRole,
  choice: boolean | null
): boolean {
  if (!isFleetDigestEligible(kind, role)) return false
  return choice ?? DEFAULT_ROLES.includes(role)
}

/**
 * La synthèse vue par un rôle : chaque section n'est gardée que si le rôle a
 * la capacité de l'écran correspondant — le mécanicien n'y lit que la
 * maintenance, les dépenses de flotte restent à l'admin (#832, #887).
 */
export function scopeWeeklyDigest(digest: WeeklyFleetDigest, role: OrgRole): WeeklyFleetDigest {
  const can = ROLE_PERMISSIONS[role]
  const empty = { total: 0, items: [] }
  return {
    ...digest,
    overdueTasks: can.has('maintenance.view') ? digest.overdueTasks : empty,
    upcomingTasks: can.has('maintenance.view') ? digest.upcomingTasks : empty,
    openIncidents: can.has('incidents.view') ? digest.openIncidents : empty,
    expiring: can.has('boats.view') ? digest.expiring : empty,
    reservations: can.has('boats.view') ? digest.reservations : null,
    expenses: can.has('reports.view') ? digest.expenses : emptyCostBreakdown(),
    overdueInvoices: can.has('invoices.view') ? digest.overdueInvoices : null,
  }
}

/** Aucune section à montrer : on n'envoie jamais une synthèse vide. */
export function isWeeklyDigestEmpty(digest: WeeklyFleetDigest): boolean {
  return (
    digest.overdueTasks.total === 0 &&
    digest.upcomingTasks.total === 0 &&
    digest.openIncidents.total === 0 &&
    digest.expiring.total === 0 &&
    (digest.reservations?.total ?? 0) === 0 &&
    digest.expenses.total === 0 &&
    (digest.overdueInvoices?.total ?? 0) === 0
  )
}

/** Un mois sans dépense, sans heure moteur, sans entretien ni location : pas de rapport. */
export function isMonthlyReportEmpty(report: MonthlyFleetReport): boolean {
  return (
    report.costs.total === 0 &&
    report.engineHours === 0 &&
    report.maintenance.planned === 0 &&
    report.maintenance.performed === 0 &&
    (report.rental?.rentalDays ?? 0) === 0 &&
    (report.rental?.revenue ?? 0) === 0
  )
}

/**
 * Bornes d'une synthèse envoyée le jour `today` (`YYYY-MM-DD`) : la semaine
 * ISO qui le contient (lundi → dimanche) et la précédente.
 */
export function weeklyDigestWindow(today: string): {
  week: string
  upcoming: { from: string; to: string }
  past: { from: string; to: string }
} {
  const day = DateTime.fromISO(today, { zone: 'utc' })
  const monday = day.startOf('week')
  const lastMonday = monday.minus({ weeks: 1 })
  return {
    week: monday.toFormat("kkkk-'W'WW"),
    upcoming: { from: monday.toISODate()!, to: monday.plus({ days: 6 }).toISODate()! },
    past: { from: lastMonday.toISODate()!, to: monday.minus({ days: 1 }).toISODate()! },
  }
}

/** Le mois civil qui précède `today` (`YYYY-MM-DD`), au format `YYYY-MM`. */
export function previousMonth(today: string): string {
  return DateTime.fromISO(today, { zone: 'utc' }).minus({ months: 1 }).toFormat('yyyy-MM')
}
