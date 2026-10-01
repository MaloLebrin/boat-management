import {
  CrewAssignmentNotFoundError,
  CrewAssignmentReservationCancelledError,
  CrewMemberAlreadyAssignedError,
  CrewMemberNotFoundError,
  CrewMemberUnavailableError,
  CrewUnavailabilityNotFoundError,
} from '#exceptions/crew_errors'
import BoatReservation from '#models/boat_reservation'
import BoatReservationCrewMember from '#models/boat_reservation_crew_member'
import CrewMember from '#models/crew_member'
import CrewUnavailability from '#models/crew_unavailability'
import NavigationLog from '#models/navigation_log'
import OrganizationMembership from '#models/organization_membership'
import NotificationService from '#services/notification_service'
import { toAppLocale } from '#shared/helpers/locale_path'
import { formatDateTime } from '#shared/helpers/date_format'
import {
  crewCertificationStatus,
  worstCrewCertificationStatus,
} from '#shared/helpers/crew_certification'
import { dayRangeOverlaps, intervalsOverlap } from '#shared/helpers/crew_planning'
import type {
  AssignReservationCrewPayload,
  CreateCrewUnavailabilityPayload,
  CrewAssignmentWarning,
  CrewAvailabilityRow,
  CrewCertificationStatus,
  CrewConflict,
  CrewMemberHistoryEntry,
  CrewPlanning,
  CrewPlanningEntry,
  CrewUnavailabilityRow,
  NavigationLogCrewRole,
  ReservationCrewRow,
  UpcomingCrewAssignment,
} from '#shared/types/crew'
import type { ReservationStatus } from '#shared/types/reservation'
import { inject } from '@adonisjs/core'
import i18nManager from '@adonisjs/i18n/services/main'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

/** Statuts qui embarquent un équipage : une réservation annulée ne bloque personne. */
const ACTIVE_STATUSES: ReservationStatus[] = ['option', 'confirmed']

/** Lignes d'historique sur la fiche d'un équipier, par source. */
const HISTORY_LIMIT = 50

/** Créneau à vérifier : instants de début et de fin d'une réservation. */
interface Window {
  startsAt: DateTime
  endsAt: DateTime
}

/** Jours couverts par un créneau, au format `YYYY-MM-DD` (fin exclue). */
function windowDays(window: Window): { firstDay: string; lastDay: string } {
  return {
    firstDay: window.startsAt.toISODate()!,
    // Une réservation qui se termine à minuit ne mord pas sur le jour suivant.
    lastDay: window.endsAt.minus({ milliseconds: 1 }).toISODate()!,
  }
}

/**
 * Planning d'équipage (#883) : affectation d'équipiers aux réservations avec
 * contrôle des chevauchements, indisponibilités, calendrier et historique.
 * L'organisation est toujours passée explicitement : un équipier ou une
 * réservation d'une autre organisation n'est jamais trouvé.
 */
@inject()
export default class CrewPlanningService {
  constructor(private notificationService: NotificationService) {}

  // ---------------------------------------------------------------------------
  // Affectations
  // ---------------------------------------------------------------------------

  async listForReservation(reservation: BoatReservation): Promise<ReservationCrewRow[]> {
    const assignments = await BoatReservationCrewMember.query()
      .where('reservationId', reservation.id)
      .preload('crewMember', (q) => q.preload('certifications'))
      .orderByRaw("case role when 'skipper' then 0 when 'instructor' then 1 else 2 end")
      .orderBy('id', 'asc')

    const conflictsByMember = await this.conflictsByMember(
      assignments.map((a) => a.crewMemberId),
      reservation,
      reservation.id
    )

    return assignments.map((assignment) => {
      const member = assignment.crewMember
      return {
        id: assignment.id,
        crewMemberId: member.id,
        fullName: member.fullName,
        email: member.email,
        role: assignment.role,
        notes: assignment.notes,
        certificationStatus: this.#memberStatus(member),
        certificationLapses: this.#certificationLapses(member, reservation.endsAt),
        conflicts: conflictsByMember.get(member.id) ?? [],
      }
    })
  }

  /**
   * Équipiers de l'organisation non encore affectés à la réservation, avec
   * leur disponibilité sur ses dates : le sélecteur grise ceux qui sont pris.
   */
  async availabilityFor(
    organizationId: number,
    reservation: BoatReservation
  ): Promise<CrewAvailabilityRow[]> {
    const members = await CrewMember.query()
      .where('organizationId', organizationId)
      .whereNotIn(
        'id',
        BoatReservationCrewMember.query()
          .select('crew_member_id')
          .where('boat_reservation_id', reservation.id)
      )
      .preload('certifications')
      .orderBy('last_name', 'asc')
      .orderBy('first_name', 'asc')

    const conflictsByMember = await this.conflictsByMember(
      members.map((m) => m.id),
      reservation,
      reservation.id
    )

    return members.map((member) => {
      const conflicts = conflictsByMember.get(member.id) ?? []
      return {
        id: member.id,
        fullName: member.fullName,
        certificationStatus: this.#memberStatus(member),
        certificationLapses: this.#certificationLapses(member, reservation.endsAt),
        available: conflicts.length === 0,
        conflicts,
      }
    })
  }

  /**
   * Embarque un équipier sur une réservation. Refuse un équipier pris sur une
   * réservation qui recoupe ce créneau ou déclaré indisponible
   * (`CrewMemberUnavailableError`) ; une certification qui expire avant la fin
   * n'est qu'un avertissement. Le verrou sur la ligne de l'équipier sérialise
   * deux affectations simultanées de la même personne.
   */
  async assign(
    organizationId: number,
    reservation: BoatReservation,
    payload: AssignReservationCrewPayload
  ): Promise<{ assignment: BoatReservationCrewMember; warning: CrewAssignmentWarning }> {
    if (reservation.status === 'cancelled') throw new CrewAssignmentReservationCancelledError()

    const { assignment, member } = await db.transaction(async (trx) => {
      const locked = await CrewMember.query({ client: trx })
        .where('id', payload.crewMemberId)
        .where('organizationId', organizationId)
        .forUpdate()
        .first()
      if (!locked) throw new CrewMemberNotFoundError()

      const already = await BoatReservationCrewMember.query({ client: trx })
        .where('reservationId', reservation.id)
        .where('crewMemberId', locked.id)
        .first()
      if (already) throw new CrewMemberAlreadyAssignedError()

      const busy = await this.conflictsByMember([locked.id], reservation, reservation.id, trx)
      const conflicts = busy.get(locked.id)
      if (conflicts && conflicts.length > 0) throw new CrewMemberUnavailableError(conflicts)

      const created = await BoatReservationCrewMember.create(
        {
          reservationId: reservation.id,
          crewMemberId: locked.id,
          role: payload.role,
          notes: payload.notes?.trim() || null,
        },
        { client: trx }
      )
      return { assignment: created, member: locked }
    })

    await member.load('certifications')
    const warning: CrewAssignmentWarning = this.#certificationLapses(member, reservation.endsAt)
      ? 'certification_lapses'
      : null

    await this.#notifyAssigned(organizationId, reservation, member, assignment)

    return { assignment, warning }
  }

  async unassign(reservation: BoatReservation, assignmentId: number): Promise<void> {
    const assignment = await BoatReservationCrewMember.query()
      .where('id', assignmentId)
      .where('reservationId', reservation.id)
      .first()
    if (!assignment) throw new CrewAssignmentNotFoundError()
    await assignment.delete()
  }

  /**
   * Ce qui occupe chacun des équipiers donnés sur le créneau : réservations
   * actives qui le recoupent (hors `excludeReservationId`) et indisponibilités
   * déclarées sur ses jours.
   */
  async conflictsByMember(
    crewMemberIds: number[],
    window: Window,
    excludeReservationId: number | null,
    trx?: TransactionClientContract
  ): Promise<Map<number, CrewConflict[]>> {
    const byMember = new Map<number, CrewConflict[]>()
    if (crewMemberIds.length === 0) return byMember

    const push = (memberId: number, conflict: CrewConflict) => {
      const list = byMember.get(memberId) ?? []
      list.push(conflict)
      byMember.set(memberId, list)
    }

    const { firstDay, lastDay } = windowDays(window)

    const [assignments, unavailabilities] = await Promise.all([
      BoatReservationCrewMember.query({ client: trx })
        .whereIn('crewMemberId', crewMemberIds)
        .whereHas('reservation', (q) => {
          q.whereIn('status', ACTIVE_STATUSES)
            .where('startsAt', '<', window.endsAt.toISO()!)
            .where('endsAt', '>', window.startsAt.toISO()!)
          if (excludeReservationId !== null) q.whereNot('id', excludeReservationId)
        })
        .preload('reservation', (q) =>
          q
            .select('id', 'boatId', 'startsAt', 'endsAt', 'clientName')
            .preload('boat', (b) => b.select('id', 'name'))
        ),
      CrewUnavailability.query({ client: trx })
        .whereIn('crewMemberId', crewMemberIds)
        .where('startsOn', '<=', lastDay)
        .where('endsOn', '>=', firstDay),
    ])

    for (const assignment of assignments) {
      const reservation = assignment.reservation
      // Garde-fou : la requête filtre déjà, la règle reste écrite une fois.
      if (
        !intervalsOverlap(
          reservation.startsAt.toMillis(),
          reservation.endsAt.toMillis(),
          window.startsAt.toMillis(),
          window.endsAt.toMillis()
        )
      ) {
        continue
      }
      push(assignment.crewMemberId, {
        kind: 'reservation',
        id: reservation.id,
        startsAt: reservation.startsAt.toISO()!,
        endsAt: reservation.endsAt.toISO()!,
        label: `${reservation.boat.name} — ${reservation.clientName}`,
      })
    }

    for (const unavailability of unavailabilities) {
      const startsOn = unavailability.startsOn.toISODate()!
      const endsOn = unavailability.endsOn.toISODate()!
      if (!dayRangeOverlaps(startsOn, endsOn, firstDay, lastDay)) continue
      push(unavailability.crewMemberId, {
        kind: 'unavailability',
        id: unavailability.id,
        startsAt: startsOn,
        endsAt: endsOn,
        label: unavailability.reason,
      })
    }

    return byMember
  }

  /**
   * Équipiers par réservation, pour le filtre « Équipier » du planning et le
   * pré-remplissage du journal de bord.
   */
  async crewMemberIdsByReservation(reservationIds: number[]): Promise<Map<number, number[]>> {
    const byReservation = new Map<number, number[]>()
    if (reservationIds.length === 0) return byReservation
    const rows = await BoatReservationCrewMember.query()
      .select('boat_reservation_id', 'crew_member_id')
      .whereIn('reservationId', reservationIds)
    for (const row of rows) {
      const list = byReservation.get(row.reservationId) ?? []
      list.push(row.crewMemberId)
      byReservation.set(row.reservationId, list)
    }
    return byReservation
  }

  /**
   * Équipage d'une sortie créée le jour J (#883) : celui de la réservation
   * active du bateau qui couvre le jour du départ. Vide sans réservation ou
   * sans équipage affecté. Statique : le journal de bord l'appelle sans
   * conteneur (ses tests l'instancient à la main).
   */
  static async crewForDeparture(
    boatId: number,
    departedAt: DateTime
  ): Promise<Array<{ crewMemberId: number; role: BoatReservationCrewMember['role'] }>> {
    const reservation = await BoatReservation.query()
      .where('boatId', boatId)
      .whereIn('status', ACTIVE_STATUSES)
      .where('startsAt', '<=', departedAt.endOf('day').toISO()!)
      .where('endsAt', '>', departedAt.startOf('day').toISO()!)
      .whereHas('crewAssignments', () => {})
      .orderBy('startsAt', 'desc')
      .first()
    if (!reservation) return []

    const assignments = await BoatReservationCrewMember.query()
      .select('crew_member_id', 'role')
      .where('reservationId', reservation.id)
    return assignments.map((a) => ({ crewMemberId: a.crewMemberId, role: a.role }))
  }

  /** Skipper affecté à la réservation, pour le contrat d'une location `skippered`. */
  async skipperFor(reservationId: number): Promise<CrewMember | null> {
    const assignment = await BoatReservationCrewMember.query()
      .where('reservationId', reservationId)
      .where('role', 'skipper')
      .preload('crewMember')
      .orderBy('id', 'asc')
      .first()
    return assignment?.crewMember ?? null
  }

  /** Équipage d'une réservation et ses rôles, pour le rôle d'équipage PDF. */
  async crewWithRolesFor(
    reservationId: number
  ): Promise<Array<{ member: CrewMember; role: BoatReservationCrewMember['role'] }>> {
    const assignments = await BoatReservationCrewMember.query()
      .where('reservationId', reservationId)
      .preload('crewMember')
      .orderByRaw("case role when 'skipper' then 0 when 'instructor' then 1 else 2 end")
      .orderBy('id', 'asc')
    return assignments.map((a) => ({ member: a.crewMember, role: a.role }))
  }

  /**
   * Affectations des prochains jours, pour l'assistant (« qui skippe le
   * catamaran samedi ? »).
   */
  async listUpcoming(organizationId: number, days: number): Promise<UpcomingCrewAssignment[]> {
    const now = DateTime.now()
    const assignments = await BoatReservationCrewMember.query()
      .whereHas('reservation', (q) =>
        q
          .where('organizationId', organizationId)
          .whereIn('status', ACTIVE_STATUSES)
          .where('endsAt', '>', now.toISO()!)
          .where('startsAt', '<', now.plus({ days }).toISO()!)
      )
      .preload('reservation', (q) => q.preload('boat', (b) => b.select('id', 'name')))
      .preload('crewMember', (q) => q.select('id', 'first_name', 'last_name'))

    return assignments
      .map((a) => ({
        reservationId: a.reservationId,
        boatName: a.reservation.boat.name,
        clientName: a.reservation.clientName,
        startsAt: a.reservation.startsAt.toISO()!,
        endsAt: a.reservation.endsAt.toISO()!,
        crewMemberName: a.crewMember.fullName,
        role: a.role,
      }))
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  }

  // ---------------------------------------------------------------------------
  // Indisponibilités
  // ---------------------------------------------------------------------------

  async listUnavailabilities(member: CrewMember): Promise<CrewUnavailabilityRow[]> {
    const rows = await CrewUnavailability.query()
      .where('crewMemberId', member.id)
      .orderBy('startsOn', 'desc')
    return rows.map((row) => this.#toUnavailabilityRow(row))
  }

  async addUnavailability(
    member: CrewMember,
    payload: CreateCrewUnavailabilityPayload
  ): Promise<CrewUnavailability> {
    return await CrewUnavailability.create({
      crewMemberId: member.id,
      startsOn: DateTime.fromISO(payload.startsOn),
      endsOn: DateTime.fromISO(payload.endsOn),
      reason: payload.reason?.trim() || null,
    })
  }

  async deleteUnavailability(member: CrewMember, unavailabilityId: number): Promise<void> {
    const row = await CrewUnavailability.query()
      .where('id', unavailabilityId)
      .where('crewMemberId', member.id)
      .first()
    if (!row) throw new CrewUnavailabilityNotFoundError()
    await row.delete()
  }

  // ---------------------------------------------------------------------------
  // Calendrier et historique
  // ---------------------------------------------------------------------------

  /**
   * Calendrier `/crew/planning` : une ligne par équipier de l'organisation,
   * avec ses embarquements et indisponibilités sur la période `[from, to]`
   * (jours inclus).
   */
  async planning(organizationId: number, from: DateTime, to: DateTime): Promise<CrewPlanning> {
    const firstDay = from.toISODate()!
    const lastDay = to.toISODate()!
    const rangeStart = from.startOf('day')
    const rangeEnd = to.endOf('day')

    const members = await CrewMember.query()
      .where('organizationId', organizationId)
      .preload('certifications', (q) => q.select('id', 'crew_member_id', 'expires_at'))
      .orderBy('last_name', 'asc')
      .orderBy('first_name', 'asc')
    const memberIds = members.map((m) => m.id)

    const [assignments, unavailabilities] =
      memberIds.length === 0
        ? [[], []]
        : await Promise.all([
            BoatReservationCrewMember.query()
              .whereIn('crewMemberId', memberIds)
              .whereHas('reservation', (q) =>
                q
                  .whereIn('status', ACTIVE_STATUSES)
                  .where('startsAt', '<', rangeEnd.toISO()!)
                  .where('endsAt', '>', rangeStart.toISO()!)
              )
              .preload('reservation', (q) =>
                q
                  .select('id', 'boatId', 'startsAt', 'endsAt', 'clientName')
                  .preload('boat', (b) => b.select('id', 'name'))
              ),
            CrewUnavailability.query()
              .whereIn('crewMemberId', memberIds)
              .where('startsOn', '<=', lastDay)
              .where('endsOn', '>=', firstDay),
          ])

    const entriesByMember = new Map<number, CrewPlanningEntry[]>()
    const push = (memberId: number, entry: CrewPlanningEntry) => {
      const list = entriesByMember.get(memberId) ?? []
      list.push(entry)
      entriesByMember.set(memberId, list)
    }
    for (const assignment of assignments) {
      const reservation = assignment.reservation
      push(assignment.crewMemberId, {
        kind: 'reservation',
        id: reservation.id,
        startsAt: reservation.startsAt.toISO()!,
        endsAt: reservation.endsAt.toISO()!,
        label: reservation.clientName,
        role: assignment.role,
        boatId: reservation.boatId,
        boatName: reservation.boat.name,
      })
    }
    for (const unavailability of unavailabilities) {
      push(unavailability.crewMemberId, {
        kind: 'unavailability',
        id: unavailability.id,
        startsAt: unavailability.startsOn.toISODate()!,
        endsAt: unavailability.endsOn.toISODate()!,
        label: unavailability.reason,
        role: null,
        boatId: null,
        boatName: null,
      })
    }

    return {
      from: firstDay,
      to: lastDay,
      rows: members.map((member) => ({
        crewMemberId: member.id,
        fullName: member.fullName,
        certificationStatus: this.#memberStatus(member),
        entries: (entriesByMember.get(member.id) ?? []).sort((a, b) =>
          a.startsAt.localeCompare(b.startsAt)
        ),
      })),
    }
  }

  /**
   * Embarquements d'un équipier, les plus récents d'abord : réservations
   * (à venir comprises) et sorties du journal de bord. `withReservations` à
   * `false` quand le module Location est inactif.
   */
  async historyFor(
    member: CrewMember,
    withReservations: boolean
  ): Promise<CrewMemberHistoryEntry[]> {
    const [assignments, logs] = await Promise.all([
      withReservations
        ? BoatReservationCrewMember.query()
            .where('crewMemberId', member.id)
            .whereHas('reservation', (q) => q.whereIn('status', ACTIVE_STATUSES))
            .preload('reservation', (q) => q.preload('boat', (b) => b.select('id', 'name')))
            .orderBy('id', 'desc')
            .limit(HISTORY_LIMIT)
        : Promise.resolve([] as BoatReservationCrewMember[]),
      NavigationLog.query()
        .whereHas('crew', (q) => q.where('crew_members.id', member.id))
        .preload('boat', (b) => b.select('id', 'name'))
        .preload('crew', (q) => q.where('crew_members.id', member.id))
        .orderBy('departedAt', 'desc')
        .limit(HISTORY_LIMIT),
    ])

    const entries: CrewMemberHistoryEntry[] = [
      ...assignments.map((a) => ({
        kind: 'reservation' as const,
        id: a.reservation.id,
        boatId: a.reservation.boatId,
        boatName: a.reservation.boat.name,
        startsAt: a.reservation.startsAt.toISO()!,
        endsAt: a.reservation.endsAt.toISO()!,
        role: a.role,
        label: a.reservation.clientName,
      })),
      ...logs.map((log) => ({
        kind: 'navigation_log' as const,
        id: log.id,
        boatId: log.boatId,
        boatName: log.boat.name,
        startsAt: log.departedAt.toISO()!,
        endsAt: log.arrivedAt?.toISO() ?? null,
        role: (log.crew[0]?.$extras.pivot_role ?? 'crew') as NavigationLogCrewRole,
        label: log.departurePortName,
      })),
    ]
    return entries.sort((a, b) => b.startsAt.localeCompare(a.startsAt))
  }

  // ---------------------------------------------------------------------------
  // Notifications
  // ---------------------------------------------------------------------------

  /**
   * Rappel J-1 (#883) : chaque équipier embarqué demain, s'il a un compte dans
   * l'organisation, reçoit bateau, client et horaires. `reminder_sent_at`
   * garantit un seul rappel, même si le scan tourne plusieurs fois.
   */
  async sendDayBeforeReminders(now: DateTime = DateTime.now()): Promise<number> {
    const tomorrow = now.plus({ days: 1 })
    const assignments = await BoatReservationCrewMember.query()
      .whereNull('reminderSentAt')
      .whereHas('reservation', (q) =>
        q
          .whereIn('status', ACTIVE_STATUSES)
          .where('startsAt', '>=', tomorrow.startOf('day').toISO()!)
          .where('startsAt', '<=', tomorrow.endOf('day').toISO()!)
      )
      .preload('reservation', (q) => q.preload('boat', (b) => b.select('id', 'name')))
      .preload('crewMember')

    let created = 0
    for (const assignment of assignments) {
      const reservation = assignment.reservation
      const membership = await this.#membershipFor(
        reservation.organizationId,
        assignment.crewMember.email
      )
      if (membership) {
        const locale = toAppLocale(membership.user.locale)
        const t = i18nManager.locale(locale)
        const params = this.#messageParams(reservation, assignment, locale, t)
        await this.notificationService.create({
          userId: membership.user.id,
          organizationId: reservation.organizationId,
          type: 'crew.assignment_reminder',
          severity: 'info',
          title: t.formatMessage('notifications.messages.crew.assignment_reminder.title', params),
          body: t.formatMessage('notifications.messages.crew.assignment_reminder.body', params),
          actionUrl: await this.#actionUrlFor(membership, reservation),
          metadata: { reservationId: reservation.id, crewAssignmentId: assignment.id },
        })
        created++
      }
      assignment.reminderSentAt = now
      await assignment.save()
    }
    return created
  }

  /** `crew.assigned` (#883) : l'équipier qui a un compte apprend son embarquement. */
  async #notifyAssigned(
    organizationId: number,
    reservation: BoatReservation,
    member: CrewMember,
    assignment: BoatReservationCrewMember
  ): Promise<void> {
    const membership = await this.#membershipFor(organizationId, member.email)
    if (!membership) return

    await reservation.load('boat')
    const locale = toAppLocale(membership.user.locale)
    const t = i18nManager.locale(locale)
    const params = this.#messageParams(reservation, assignment, locale, t)
    await this.notificationService.create({
      userId: membership.user.id,
      organizationId,
      type: 'crew.assigned',
      severity: 'info',
      title: t.formatMessage('notifications.messages.crew.assigned.title', params),
      body: t.formatMessage('notifications.messages.crew.assigned.body', params),
      actionUrl: await this.#actionUrlFor(membership, reservation),
      metadata: { reservationId: reservation.id, crewAssignmentId: assignment.id },
    })
  }

  #messageParams(
    reservation: BoatReservation,
    assignment: BoatReservationCrewMember,
    locale: string,
    t: ReturnType<typeof i18nManager.locale>
  ): Record<string, string> {
    return {
      boatName: reservation.boat.name,
      clientName: reservation.clientName,
      role: t.formatMessage(`crew.planning.roles.${assignment.role}`),
      startsAt: formatDateTime(reservation.startsAt.toJSDate(), locale),
      endsAt: formatDateTime(reservation.endsAt.toJSDate(), locale),
    }
  }

  /** Lien vers les réservations du bateau, si le destinataire peut les ouvrir. */
  async #actionUrlFor(
    membership: OrganizationMembership,
    reservation: BoatReservation
  ): Promise<string | null> {
    const canView = await membership.user.hasPermission(reservation.organizationId, 'boats.view')
    return canView ? `/boats/${reservation.boatId}/reservations` : null
  }

  /** Membre de l'organisation dont l'e-mail est celui de l'équipier. */
  async #membershipFor(
    organizationId: number,
    email: string | null
  ): Promise<OrganizationMembership | null> {
    if (!email) return null
    return await OrganizationMembership.query()
      .where('organizationId', organizationId)
      .whereHas('user', (q) => q.whereRaw('lower(email) = ?', [email.toLowerCase()]))
      .preload('user')
      .first()
  }

  // ---------------------------------------------------------------------------

  #memberStatus(member: CrewMember): CrewCertificationStatus | null {
    return worstCrewCertificationStatus(
      member.certifications.map((cert) => crewCertificationStatus(cert.expiresInDays))
    )
  }

  /** Une certification datée de l'équipier expire avant la fin du créneau. */
  #certificationLapses(member: CrewMember, endsAt: DateTime): boolean {
    return member.certifications.some(
      (cert) => cert.expiresAt !== null && cert.expiresAt.endOf('day') < endsAt
    )
  }

  #toUnavailabilityRow(row: CrewUnavailability): CrewUnavailabilityRow {
    return {
      id: row.id,
      startsOn: row.startsOn.toISODate()!,
      endsOn: row.endsOn.toISODate()!,
      reason: row.reason,
    }
  }
}
