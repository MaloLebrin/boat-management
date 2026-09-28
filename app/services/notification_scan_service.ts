import { inject } from '@adonisjs/core'
import i18nManager from '@adonisjs/i18n/services/main'
import { DateTime } from 'luxon'
import type Boat from '#models/boat'
import BoatDocument from '#models/boat_document'
import BoatMaintenanceTask from '#models/boat_maintenance_task'
import BoatSafetyEquipment from '#models/boat_safety_equipment'
import OrganizationMembership from '#models/organization_membership'
import NotificationService from '#services/notification_service'
import { resolveEffectiveExpiry } from '#shared/helpers/safety_compliance'
import type { NotificationSeverity, NotificationType } from '#shared/types/notification'

/** Fenêtre « bientôt » (jours) pour les échéances/expirations à venir. */
const DUE_SOON_WINDOW_DAYS = 30
/** Anti-doublon : pas de re-notification d'une même entité avant N jours. */
const DEDUPE_WINDOW_DAYS = 30

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
}

/**
 * Scanne la flotte pour créer des notifications planifiées : tâches de
 * maintenance en retard / à venir, documents et équipements de sécurité expirés
 * ou expirant bientôt. Les notifications sont agrégées par bateau (une notif par
 * bateau + type, avec un compte) et destinées aux admins de l'organisation.
 * L'anti-doublon (`NotificationService.createIfNotRecent`) évite le spam d'un
 * scan quotidien sur une condition persistante.
 */
@inject()
export default class NotificationScanService {
  constructor(private notificationService: NotificationService) {}

  async run(): Promise<{ created: number }> {
    // Les trois scans sont indépendants → en parallèle.
    const scanned = await Promise.all([
      this.scanMaintenance(),
      this.scanDocuments(),
      this.scanSafetyEquipment(),
    ])
    const groups = scanned.flat()

    if (groups.length === 0) return { created: 0 }

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
            actionUrl: group.recipientUserId !== undefined ? '/planning' : `/boats/${group.boatId}`,
            metadata: { boatId: group.boatId, count: group.count },
          },
          { metadataKey: 'boatId', withinDays: DEDUPE_WINDOW_DAYS }
        )
      })
    )

    const created = results.filter((notification) => notification !== null).length
    return { created }
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
        .preload('boat'),
    ])

    return [
      ...this.groupByBoat(expired, 'document.expired', 'error'),
      ...this.groupByBoat(expiringSoon, 'document.expiring_soon', 'warning'),
    ]
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
  private async adminsFor(organizationId: number): Promise<OrganizationMembership[]> {
    return OrganizationMembership.query()
      .where('organizationId', organizationId)
      .where('role', 'admin')
      .preload('user')
  }
}
