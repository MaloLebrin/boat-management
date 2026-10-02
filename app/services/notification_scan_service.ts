import { inject } from '@adonisjs/core'
import i18nManager from '@adonisjs/i18n/services/main'
import { DateTime } from 'luxon'
import type Boat from '#models/boat'
import BoatDocument from '#models/boat_document'
import BoatMaintenanceTask from '#models/boat_maintenance_task'
import BoatReservation from '#models/boat_reservation'
import BoatSafetyEquipment from '#models/boat_safety_equipment'
import CrewCertification from '#models/crew_certification'
import OrganizationMembership from '#models/organization_membership'
import NotificationService from '#services/notification_service'
import CrewPlanningService from '#services/crew_planning_service'
import OrganizationModuleService from '#services/organization_module_service'
import QuotaService from '#services/quota_service'
import Organization from '#models/organization'
import { resolveEffectiveExpiry } from '#shared/helpers/safety_compliance'
import { toAppLocale } from '#shared/helpers/locale_path'
import { paymentAttention } from '#shared/helpers/reservation_payment'
import {
  CREW_CERT_EXPIRING_SOON_DAYS,
  crewCertificationAlertWindow,
} from '#shared/helpers/crew_certification'
import type { NotificationSeverity, NotificationType } from '#shared/types/notification'

/** Fenêtre « bientôt » (jours) pour les échéances/expirations à venir. */
const DUE_SOON_WINDOW_DAYS = 30
/** Anti-doublon : pas de re-notification d'une même entité avant N jours. */
const DEDUPE_WINDOW_DAYS = 30
/**
 * Paiements de location (#875) : les départs s'enchaînent chaque semaine, une
 * relance par bateau et par mois en laisserait passer. Une par semaine.
 */
const PAYMENT_DEDUPE_WINDOW_DAYS = 7
/** Départs de demain (#888) : un passage par jour, voir `scanReservationsStartingTomorrow`. */
const STARTS_TOMORROW_DEDUPE_DAYS = 0.5
/**
 * Certifications d'équipage (#882) : l'anti-doublon porte sur la fenêtre
 * (60/30/7 jours), pas sur un délai fixe — la clé change en entrant dans la
 * fenêtre suivante. Couvrir la plus large évite qu'une alerte « 60 jours » se
 * répète avant que l'échéance n'entre dans celle des 30 jours.
 */
const CREW_CERT_DEDUPE_WINDOW_DAYS = CREW_CERT_EXPIRING_SOON_DAYS

/**
 * Notification agrégée par bateau (une notif par bateau + type, avec compte).
 * `recipientUserId` : destinataire unique (l'assigné d'une tâche, #868) ; à
 * défaut, la notification part aux admins de l'organisation.
 */
interface ScanGroup {
  type: NotificationType
  severity: NotificationSeverity
  organizationId: number
  boatId: number
  boatName: string
  count: number
  recipientUserId?: number
  /** Écran d'arrivée, à défaut la fiche du bateau (ou le planning pour un assigné). */
  actionUrl?: string
  /** Fenêtre anti-doublon, à défaut `DEDUPE_WINDOW_DAYS`. */
  dedupeDays?: number
}

/**
 * Alerte d'un équipier (#882) : ses certifications d'un même état, agrégées.
 * Pas de bateau : l'équipage est rattaché à l'organisation.
 */
interface CrewCertificationGroup {
  type: 'crew_certification.expiring_soon' | 'crew_certification.expired'
  severity: NotificationSeverity
  organizationId: number
  crewMemberId: number
  crewMemberName: string
  crewMemberEmail: string | null
  count: number
  /** Échéance la plus proche (jours), pour le texte « expire dans N jours ». */
  days: number
  /** Clé anti-doublon : `<équipier>:<fenêtre>` ou `<équipier>:expired`. */
  alertKey: string
}

/**
 * Scanne la flotte pour créer des notifications planifiées : tâches de
 * maintenance en retard / à venir, documents et équipements de sécurité expirés
 * ou expirant bientôt, acomptes et soldes de location à encaisser (#875),
 * certifications d'équipage à renouveler (#882, par équipier et non par bateau), rappels
 * J-1 des équipiers embarqués sur une réservation (#883). Les
 * notifications sont agrégées par bateau (une notif par bateau + type, avec un
 * compte) et destinées aux admins de l'organisation.
 * L'anti-doublon (`NotificationService.createIfNotRecent`) évite le spam d'un
 * scan quotidien sur une condition persistante.
 */
@inject()
export default class NotificationScanService {
  constructor(
    private notificationService: NotificationService,
    // Défaut : les tests et le job construisent le service à la main.
    private quotaService: QuotaService = new QuotaService(new OrganizationModuleService()),
    private crewPlanningService: CrewPlanningService = new CrewPlanningService(notificationService)
  ) {}

  async run(): Promise<{ created: number }> {
    // Les scans sont indépendants → en parallèle.
    const scanned = await Promise.all([
      this.scanMaintenance(),
      this.scanDocuments(),
      this.scanSafetyEquipment(),
      this.scanReservationPayments(),
      this.scanReservationsStartingTomorrow(),
    ])
    const groups = scanned.flat()
    // Rappels J-1 des équipiers embarqués demain (#883), par affectation.
    const crewCreated =
      (await this.notifyCrewCertifications()) +
      (await this.crewPlanningService.sendDayBeforeReminders())

    if (groups.length === 0) return { created: crewCreated }

    // Résout les admins de chaque organisation concernée en une seule passe
    // parallèle (une requête par org distincte), plutôt qu'au fil d'une boucle.
    const orgIds = [...new Set(groups.map((group) => group.organizationId))]
    const adminsByOrg = new Map(
      await Promise.all(orgIds.map(async (orgId) => [orgId, await this.adminsFor(orgId)] as const))
    )

    const locale = i18nManager.locale(i18nManager.defaultLocale)

    // Une notification par (groupe × destinataire). Un même utilisateur ne
    // reçoit qu'une notification par bateau et par type, même s'il est à la
    // fois admin et assigné : les groupes admin, qui comptent tout le bateau,
    // passent en premier (#868).
    const seen = new Set<string>()
    const deliveries: Array<{ group: ScanGroup; userId: number }> = []
    const ordered = [
      ...groups.filter((group) => group.recipientUserId === undefined),
      ...groups.filter((group) => group.recipientUserId !== undefined),
    ]
    for (const group of ordered) {
      const recipients =
        group.recipientUserId !== undefined
          ? [group.recipientUserId]
          : (adminsByOrg.get(group.organizationId) ?? []).map((admin) => admin.user.id)
      for (const userId of recipients) {
        const key = `${userId}:${group.type}:${group.boatId}`
        if (seen.has(key)) continue
        seen.add(key)
        deliveries.push({ group, userId })
      }
    }

    // Toutes créées en parallèle.
    const results = await Promise.all(
      deliveries.map(({ group, userId }) => {
        const params = { boatName: group.boatName, count: String(group.count) }
        return this.notificationService.createIfNotRecent(
          {
            userId,
            organizationId: group.organizationId,
            type: group.type,
            severity: group.severity,
            title: locale.formatMessage(`notifications.messages.${group.type}.title`, params),
            body: locale.formatMessage(`notifications.messages.${group.type}.body`, params),
            // Un assigné peut être mécanicien, sans accès à la fiche bateau :
            // il est envoyé vers le planning, ouvert à tous les rôles de
            // maintenance.
            actionUrl:
              group.actionUrl ??
              (group.recipientUserId !== undefined ? '/planning' : `/boats/${group.boatId}`),
            metadata: { boatId: group.boatId, count: group.count },
          },
          { metadataKey: 'boatId', withinDays: group.dedupeDays ?? DEDUPE_WINDOW_DAYS }
        )
      })
    )

    const created = results.filter((notification) => notification !== null).length
    return { created: created + crewCreated }
  }

  /**
   * Certifications d'équipage échues ou qui expirent dans les 60 jours (#882),
   * une notification par équipier et par état. Destinataires : les admins et
   * l'équipier lui-même quand son e-mail est celui d'un membre de
   * l'organisation. Une échéance n'alerte qu'une fois par fenêtre (60, 30,
   * 7 jours) ; une certification échue, une fois par mois.
   */
  private async notifyCrewCertifications(): Promise<number> {
    const groups = await this.scanCrewCertifications()
    if (groups.length === 0) return 0

    const orgIds = [...new Set(groups.map((group) => group.organizationId))]
    const membershipsByOrg = new Map(
      await Promise.all(
        orgIds.map(async (orgId) => [orgId, await this.membershipsFor(orgId)] as const)
      )
    )
    const deliveries: Array<{
      group: CrewCertificationGroup
      membership: OrganizationMembership
      actionUrl: string | null
    }> = []
    for (const group of groups) {
      const memberships = membershipsByOrg.get(group.organizationId) ?? []
      const recipients = new Map<number, OrganizationMembership>()
      for (const membership of memberships) {
        if (membership.role === 'admin') recipients.set(membership.user.id, membership)
      }
      const email = group.crewMemberEmail?.toLowerCase()
      const self = email
        ? memberships.find((membership) => membership.user.email.toLowerCase() === email)
        : undefined
      if (self) recipients.set(self.user.id, self)

      for (const membership of recipients.values()) {
        // La liste d'équipage est ouverte à `crew.create` : un équipier qui n'y
        // a pas accès reçoit l'alerte sans lien plutôt qu'un lien vers un refus.
        const canOpen = await membership.user.hasPermission(group.organizationId, 'crew.create')
        deliveries.push({ group, membership, actionUrl: canOpen ? '/crew' : null })
      }
    }

    const results = await Promise.all(
      deliveries.map(({ group, membership, actionUrl }) => {
        // Rédigée dans la langue du destinataire (#414), à défaut celle de l'app.
        const locale = i18nManager.locale(toAppLocale(membership.user.locale))
        const params = {
          crewMemberName: group.crewMemberName,
          count: String(group.count),
          days: String(group.days),
        }
        return this.notificationService.createIfNotRecent(
          {
            userId: membership.user.id,
            organizationId: group.organizationId,
            type: group.type,
            severity: group.severity,
            title: locale.formatMessage(`notifications.messages.${group.type}.title`, params),
            body: locale.formatMessage(`notifications.messages.${group.type}.body`, params),
            actionUrl,
            metadata: {
              crewMemberId: group.crewMemberId,
              count: group.count,
              crewAlertKey: group.alertKey,
            },
          },
          {
            metadataKey: 'crewAlertKey',
            withinDays:
              group.type === 'crew_certification.expired'
                ? DEDUPE_WINDOW_DAYS
                : CREW_CERT_DEDUPE_WINDOW_DAYS,
          }
        )
      })
    )
    return results.filter((notification) => notification !== null).length
  }

  private async scanCrewCertifications(): Promise<CrewCertificationGroup[]> {
    const horizon = DateTime.now().startOf('day').plus({ days: CREW_CERT_EXPIRING_SOON_DAYS })
    const certifications = await CrewCertification.query()
      .whereNotNull('expires_at')
      .where('expires_at', '<=', horizon.toISODate()!)
      .preload('crewMember')

    const byKey = new Map<string, CrewCertificationGroup>()
    for (const cert of certifications) {
      const days = cert.expiresInDays!
      const expired = days < 0
      const type = expired ? 'crew_certification.expired' : 'crew_certification.expiring_soon'
      const key = `${cert.crewMemberId}:${type}`
      const member = cert.crewMember
      const existing = byKey.get(key)
      if (existing) {
        existing.count++
        existing.days = Math.min(existing.days, days)
        continue
      }
      byKey.set(key, {
        type,
        severity: expired ? 'error' : 'warning',
        organizationId: member.organizationId,
        crewMemberId: member.id,
        crewMemberName: member.fullName,
        crewMemberEmail: member.email,
        count: 1,
        days,
        alertKey: '',
      })
    }

    // La fenêtre dépend de l'échéance la plus proche du lot : fixée après
    // l'agrégation (l'ordre de lecture des certifications est libre).
    return [...byKey.values()].map((group) => ({
      ...group,
      alertKey:
        group.type === 'crew_certification.expired'
          ? `${group.crewMemberId}:expired`
          : `${group.crewMemberId}:${crewCertificationAlertWindow(group.days)}`,
    }))
  }

  private async scanMaintenance(): Promise<ScanGroup[]> {
    const today = DateTime.now().startOf('day')
    const soon = today.plus({ days: DUE_SOON_WINDOW_DAYS })

    const [overdue, dueSoon] = await Promise.all([
      BoatMaintenanceTask.query()
        .where('status', 'open')
        .whereNotNull('due_at')
        .where('due_at', '<', today.toISODate()!)
        .preload('boat'),
      BoatMaintenanceTask.query()
        .where('status', 'open')
        .whereNotNull('due_at')
        .where('due_at', '>=', today.toISODate()!)
        .where('due_at', '<=', soon.toISODate()!)
        .preload('boat'),
    ])

    // Une échéance proche va à l'assigné plutôt qu'aux admins : c'est lui qui
    // doit agir. Un retard, lui, remonte aux admins **et** à l'assigné (#868).
    const unassignedSoon = dueSoon.filter((task) => task.assigneeId === null)
    return [
      ...this.groupByBoat(overdue, 'maintenance.overdue', 'error'),
      ...this.groupByAssignee(overdue, 'maintenance.overdue', 'error'),
      ...this.groupByBoat(unassignedSoon, 'maintenance.due_soon', 'warning'),
      ...this.groupByAssignee(dueSoon, 'maintenance.due_soon', 'warning'),
    ]
  }

  /**
   * Comme `groupByBoat`, mais une notification par (bateau × assigné), adressée
   * à l'assigné seul. Les tâches sans assigné sont ignorées.
   */
  private groupByAssignee(
    tasks: BoatMaintenanceTask[],
    type: NotificationType,
    severity: NotificationSeverity
  ): ScanGroup[] {
    const byAssignee = new Map<number, BoatMaintenanceTask[]>()
    for (const task of tasks) {
      if (task.assigneeId === null) continue
      byAssignee.set(task.assigneeId, [...(byAssignee.get(task.assigneeId) ?? []), task])
    }
    return [...byAssignee.entries()].flatMap(([assigneeId, own]) =>
      this.groupByBoat(own, type, severity).map((group) => ({
        ...group,
        recipientUserId: assigneeId,
      }))
    )
  }

  private async scanDocuments(): Promise<ScanGroup[]> {
    const today = DateTime.now().startOf('day')
    const soon = today.plus({ days: DUE_SOON_WINDOW_DAYS })

    const [expired, expiringSoon] = await Promise.all([
      BoatDocument.query()
        .whereNotNull('expires_at')
        .where('expires_at', '<', today.toISODate()!)
        .preload('boat'),
      BoatDocument.query()
        .whereNotNull('expires_at')
        .where('expires_at', '>=', today.toISODate()!)
        .where('expires_at', '<=', soon.toISODate()!)
        .preload('boat', (query) => query.preload('owners')),
    ])

    return [
      ...this.groupByBoat(expired, 'document.expired', 'error'),
      ...this.groupByBoat(expiringSoon, 'document.expiring_soon', 'warning'),
      ...this.ownerDocumentGroups(expiringSoon),
    ]
  }

  /**
   * Le propriétaire d'un bateau confié (#890) apprend qu'un de ses documents
   * (assurance, francisation…) arrive à échéance : une notification par bateau
   * et par propriétaire, vers son portail.
   */
  private ownerDocumentGroups(documents: BoatDocument[]): ScanGroup[] {
    return this.groupByBoat(documents, 'owner.document_expiring', 'warning').flatMap((group) => {
      const boat = documents.find((doc) => doc.boat.id === group.boatId)!.boat
      return boat.owners
        .filter((owner) => owner.anonymizedAt === null)
        .map((owner) => ({
          ...group,
          recipientUserId: owner.id,
          actionUrl: `/owner/boats/${group.boatId}`,
        }))
    })
  }

  /**
   * Équipements de sécurité échus — sur la date **saisie** comme sur la durée
   * de vie **par défaut** du corpus Division 240 (#582).
   *
   * Sans ce second volet, un extincteur ou des fusées dont l'utilisateur n'a
   * jamais rempli la date de péremption n'étaient jamais signalés, alors que la
   * date d'achat suffit à les dater. Une révision échue (extincteur, radeau)
   * emprunte le même type de notification qu'une péremption : le vocabulaire
   * `NotificationType` ne distingue pas les deux, et l'action attendue — ouvrir
   * la fiche bateau — est la même.
   */
  private async scanSafetyEquipment(): Promise<ScanGroup[]> {
    const today = DateTime.now().startOf('day')
    const soon = today.plus({ days: DUE_SOON_WINDOW_DAYS })

    const [expired, expiringSoon, undated] = await Promise.all([
      BoatSafetyEquipment.query()
        .whereNotNull('expiry_date')
        .where('expiry_date', '<', today.toISODate()!)
        .preload('boat'),
      BoatSafetyEquipment.query()
        .whereNotNull('expiry_date')
        .where('expiry_date', '>=', today.toISODate()!)
        .where('expiry_date', '<=', soon.toISODate()!)
        .preload('boat'),
      BoatSafetyEquipment.query()
        .whereNull('expiry_date')
        .whereNotNull('purchased_at')
        .preload('boat'),
    ])

    // La durée de vie dépend du type d'équipement : le tri se fait donc en
    // mémoire, sur le seul lot des équipements datés d'un achat sans péremption.
    const derivedExpired: BoatSafetyEquipment[] = []
    const derivedExpiringSoon: BoatSafetyEquipment[] = []
    for (const item of undated) {
      const expiry = resolveEffectiveExpiry(item)
      if (!expiry) continue
      if (expiry.date < today) derivedExpired.push(item)
      else if (expiry.date <= soon) derivedExpiringSoon.push(item)
    }

    // Les deux volets sont fusionnés avant l'agrégation : sans quoi un bateau
    // cumulant les deux cas recevrait deux notifications du même type.
    return [
      ...this.groupByBoat([...expired, ...derivedExpired], 'safety_equipment.expired', 'error'),
      ...this.groupByBoat(
        [...expiringSoon, ...derivedExpiringSoon],
        'safety_equipment.expiring_soon',
        'warning'
      ),
    ]
  }

  /**
   * Argent des locations (#875) : réservations confirmées dont l'acompte n'est
   * pas arrivé, et départs à moins de 7 jours pas encore soldés. La règle est
   * celle du badge de la liste (`paymentAttention`), pour que la notification
   * et l'écran disent la même chose.
   */
  private async scanReservationPayments(): Promise<ScanGroup[]> {
    const now = DateTime.now()
    const reservations = await BoatReservation.query()
      .where('status', 'confirmed')
      .whereIn('paymentStatus', ['unpaid', 'deposit_paid'])
      .where('endsAt', '>', now.toISO()!)
      .preload('boat')

    const charterOrgIds = await this.charterOrgIds(reservations)

    const depositDue: BoatReservation[] = []
    const balanceDue: BoatReservation[] = []
    for (const reservation of reservations) {
      if (!charterOrgIds.has(reservation.organizationId)) continue
      const attention = paymentAttention(
        {
          status: reservation.status,
          paymentStatus: reservation.paymentStatus,
          depositAmount: reservation.depositAmount,
          totalPrice: reservation.totalPrice,
          paidAmount: reservation.paidAmount,
          startsAt: reservation.startsAt.toISO()!,
        },
        now.toJSDate()
      )
      if (attention === 'deposit_due') depositDue.push(reservation)
      else if (attention === 'balance_due') balanceDue.push(reservation)
    }

    const toReservations = (group: ScanGroup): ScanGroup => ({
      ...group,
      actionUrl: `/boats/${group.boatId}/reservations`,
      dedupeDays: PAYMENT_DEDUPE_WINDOW_DAYS,
    })
    return [
      ...this.groupByBoat(depositDue, 'reservation.deposit_due', 'warning').map(toReservations),
      ...this.groupByBoat(balanceDue, 'reservation.balance_due', 'warning').map(toReservations),
    ]
  }

  /**
   * Module Location coupé : la page des réservations est fermée, le rappel
   * mènerait à un refus. Renvoie les organisations dont le module est actif.
   */
  private async charterOrgIds(reservations: BoatReservation[]): Promise<Set<number>> {
    const orgIds = [...new Set(reservations.map((r) => r.organizationId))]
    const organizations = orgIds.length ? await Organization.query().whereIn('id', orgIds) : []
    const charterOrgIds = new Set<number>()
    for (const organization of organizations) {
      if (await this.quotaService.canManageReservations(organization)) {
        charterOrgIds.add(organization.id)
      }
    }
    return charterOrgIds
  }

  /**
   * Départs de demain (#888) : réservations confirmées qui commencent le
   * lendemain (jour de Paris, celui du cron), une notification par bateau.
   * Le scan est quotidien : une demi-journée d'anti-doublon couvre un second
   * passage le même jour sans masquer le départ du surlendemain.
   */
  private async scanReservationsStartingTomorrow(): Promise<ScanGroup[]> {
    const tomorrow = DateTime.now().setZone('Europe/Paris').plus({ days: 1 }).startOf('day')
    const reservations = await BoatReservation.query()
      .where('status', 'confirmed')
      .where('startsAt', '>=', tomorrow.toUTC().toISO()!)
      .where('startsAt', '<', tomorrow.plus({ days: 1 }).toUTC().toISO()!)
      .preload('boat')

    const charterOrgIds = await this.charterOrgIds(reservations)
    const starting = reservations.filter((r) => charterOrgIds.has(r.organizationId))
    return this.groupByBoat(starting, 'reservation.starts_tomorrow', 'info').map((group) => ({
      ...group,
      actionUrl: `/boats/${group.boatId}/reservations`,
      dedupeDays: STARTS_TOMORROW_DEDUPE_DAYS,
    }))
  }

  /**
   * Agrège des entités partageant une relation `boat` en une notification par
   * bateau : au plus une `ScanGroup` par bateau, `count` comptant les entités
   * concernées sur ce bateau. Le `type` et la `severity` fournis s'appliquent à
   * tout le lot (ex. toutes les tâches en retard d'un bateau → une seule notif).
   *
   * @param items entités préchargées avec leur relation `boat`
   * @param type type de notification à produire pour ce lot
   * @param severity sévérité associée
   * @returns une `ScanGroup` par bateau distinct présent dans `items`
   */
  private groupByBoat(
    items: Array<{ boat: Boat }>,
    type: NotificationType,
    severity: NotificationSeverity
  ): ScanGroup[] {
    const byBoat = new Map<number, ScanGroup>()
    for (const item of items) {
      const boat = item.boat
      const existing = byBoat.get(boat.id)
      if (existing) {
        existing.count++
        continue
      }
      byBoat.set(boat.id, {
        type,
        severity,
        organizationId: boat.organizationId,
        boatId: boat.id,
        boatName: boat.name,
        count: 1,
      })
    }
    return [...byBoat.values()]
  }

  /**
   * Memberships admin (utilisateur préchargé) d'une organisation : les
   * destinataires des notifications de flotte. Appelée une fois par organisation
   * distincte dans `run()`, d'où l'absence de cache interne.
   *
   * @param organizationId organisation ciblée
   * @returns les memberships de rôle `admin`, relation `user` préchargée
   */
  private async membershipsFor(organizationId: number): Promise<OrganizationMembership[]> {
    return OrganizationMembership.query().where('organizationId', organizationId).preload('user')
  }

  private async adminsFor(organizationId: number): Promise<OrganizationMembership[]> {
    return OrganizationMembership.query()
      .where('organizationId', organizationId)
      .where('role', 'admin')
      .preload('user')
  }
}
