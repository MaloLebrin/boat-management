import { inject } from '@adonisjs/core'
import i18nManager from '@adonisjs/i18n/services/main'
import { DateTime } from 'luxon'
import type Boat from '#models/boat'
import BoatDocument from '#models/boat_document'
import BoatMaintenanceTask from '#models/boat_maintenance_task'
import BoatSafetyEquipment from '#models/boat_safety_equipment'
import OrganizationMembership from '#models/organization_membership'
import NotificationService from '#services/notification_service'
import type { NotificationSeverity, NotificationType } from '#shared/types/notification'

/** Fenêtre « bientôt » (jours) pour les échéances/expirations à venir. */
const DUE_SOON_WINDOW_DAYS = 30
/** Anti-doublon : pas de re-notification d'une même entité avant N jours. */
const DEDUPE_WINDOW_DAYS = 30

/** Notification agrégée par bateau (une notif par bateau + type, avec compte). */
interface ScanGroup {
  type: NotificationType
  severity: NotificationSeverity
  organizationId: number
  boatId: number
  boatName: string
  count: number
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
    const groups = [
      ...(await this.scanMaintenance()),
      ...(await this.scanDocuments()),
      ...(await this.scanSafetyEquipment()),
    ]

    const adminCache = new Map<number, OrganizationMembership[]>()
    const locale = i18nManager.locale(i18nManager.defaultLocale)
    let created = 0

    for (const group of groups) {
      const admins = await this.adminsFor(group.organizationId, adminCache)
      const params = { boatName: group.boatName, count: String(group.count) }

      for (const admin of admins) {
        const notification = await this.notificationService.createIfNotRecent(
          {
            userId: admin.user.id,
            organizationId: group.organizationId,
            type: group.type,
            severity: group.severity,
            title: locale.formatMessage(`notifications.messages.${group.type}.title`, params),
            body: locale.formatMessage(`notifications.messages.${group.type}.body`, params),
            actionUrl: `/boats/${group.boatId}`,
            metadata: { boatId: group.boatId, count: group.count },
          },
          { metadataKey: 'boatId', withinDays: DEDUPE_WINDOW_DAYS }
        )
        if (notification) created++
      }
    }

    return { created }
  }

  private async scanMaintenance(): Promise<ScanGroup[]> {
    const today = DateTime.now().startOf('day')
    const soon = today.plus({ days: DUE_SOON_WINDOW_DAYS })

    const overdue = await BoatMaintenanceTask.query()
      .where('status', 'open')
      .whereNotNull('due_at')
      .where('due_at', '<', today.toISODate()!)
      .preload('boat')

    const dueSoon = await BoatMaintenanceTask.query()
      .where('status', 'open')
      .whereNotNull('due_at')
      .where('due_at', '>=', today.toISODate()!)
      .where('due_at', '<=', soon.toISODate()!)
      .preload('boat')

    return [
      ...this.groupByBoat(overdue, 'maintenance.overdue', 'error'),
      ...this.groupByBoat(dueSoon, 'maintenance.due_soon', 'warning'),
    ]
  }

  private async scanDocuments(): Promise<ScanGroup[]> {
    const today = DateTime.now().startOf('day')
    const soon = today.plus({ days: DUE_SOON_WINDOW_DAYS })

    const expired = await BoatDocument.query()
      .whereNotNull('expires_at')
      .where('expires_at', '<', today.toISODate()!)
      .preload('boat')

    const expiringSoon = await BoatDocument.query()
      .whereNotNull('expires_at')
      .where('expires_at', '>=', today.toISODate()!)
      .where('expires_at', '<=', soon.toISODate()!)
      .preload('boat')

    return [
      ...this.groupByBoat(expired, 'document.expired', 'error'),
      ...this.groupByBoat(expiringSoon, 'document.expiring_soon', 'warning'),
    ]
  }

  private async scanSafetyEquipment(): Promise<ScanGroup[]> {
    const today = DateTime.now().startOf('day')
    const soon = today.plus({ days: DUE_SOON_WINDOW_DAYS })

    const expired = await BoatSafetyEquipment.query()
      .whereNotNull('expiry_date')
      .where('expiry_date', '<', today.toISODate()!)
      .preload('boat')

    const expiringSoon = await BoatSafetyEquipment.query()
      .whereNotNull('expiry_date')
      .where('expiry_date', '>=', today.toISODate()!)
      .where('expiry_date', '<=', soon.toISODate()!)
      .preload('boat')

    return [
      ...this.groupByBoat(expired, 'safety_equipment.expired', 'error'),
      ...this.groupByBoat(expiringSoon, 'safety_equipment.expiring_soon', 'warning'),
    ]
  }

  /** Agrège des entités portant une relation `boat` en une notif par bateau. */
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

  private async adminsFor(
    organizationId: number,
    cache: Map<number, OrganizationMembership[]>
  ): Promise<OrganizationMembership[]> {
    const cached = cache.get(organizationId)
    if (cached) return cached

    const admins = await OrganizationMembership.query()
      .where('organizationId', organizationId)
      .where('role', 'admin')
      .preload('user')

    cache.set(organizationId, admins)
    return admins
  }
}
