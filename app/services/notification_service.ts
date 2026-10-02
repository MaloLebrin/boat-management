import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import Notification from '#models/notification'
import NotificationDispatcherService from '#services/notification_dispatcher_service'
import NotificationPreferenceService from '#services/notification_preference_service'
import { isPushableNotificationType } from '#shared/constants/push'
import { isSafeInternalPath } from '#shared/helpers/safe_path'
import type { CreateNotificationParams, NotificationsSharedProps } from '#shared/types/notification'
import * as NotificationTransformer from '#transformers/notification_transformer'
import transmit from '@adonisjs/transmit/services/main'

/**
 * Point d'entrée unique des notifications : tous les émetteurs (listeners,
 * scans, services) appellent `create()`, qui fait office de dispatcher (#888)
 * — préférence lue par canal, puis in-app, push et e-mail.
 */
@inject()
export default class NotificationService {
  constructor(
    private preferences: NotificationPreferenceService = new NotificationPreferenceService(),
    private dispatcher: NotificationDispatcherService = new NotificationDispatcherService()
  ) {}

  async create(params: CreateNotificationParams): Promise<Notification> {
    // Garde à l'écriture (#780). `actionUrl` est une colonne de texte libre
    // dont la valeur est passée telle quelle à une navigation, côté page
    // Inertia comme côté service worker. Les huit producteurs actuels y
    // écrivent des chemins littéraux, mais rien ne l'impose : c'est une
    // convention tenue à la main. Celle-ci protège les consommateurs qu'on
    // n'a pas encore écrits.
    //
    // Une valeur non conforme devient `null` plutôt que de faire échouer la
    // création : une notification sans lien reste utile, une notification
    // perdue ne l'est pas.
    const actionUrl = params.actionUrl ?? null
    if (actionUrl !== null && !isSafeInternalPath(actionUrl)) {
      logger.warn(
        { type: params.type, userId: params.userId },
        'notification actionUrl is not a safe internal path — stored as null'
      )
    }

    // Préférence de l'utilisateur pour la famille du type (#888) : lue une
    // fois, avant chaque canal. Tous les émetteurs passent par ici.
    const channels = await this.preferences.channelsFor(
      params.userId,
      params.organizationId,
      params.type
    )

    // La ligne est écrite même coupée in-app : c'est le journal qui sert
    // l'anti-doublon des scans (`createIfNotRecent`), et l'attente du résumé.
    const notification = await Notification.create({
      userId: params.userId,
      organizationId: params.organizationId,
      type: params.type,
      severity: params.severity ?? 'info',
      title: params.title,
      body: params.body ?? null,
      actionUrl: isSafeInternalPath(actionUrl) ? actionUrl : null,
      metadata: params.metadata ?? null,
      inApp: channels.inApp,
      emailDigestPending: false,
    })

    if (channels.inApp) {
      try {
        // Named-property interfaces lack the index signature Broadcastable requires; cast is safe (all fields are JSON primitives).
        const payload = {
          notification: NotificationTransformer.toRow(notification),
        } as unknown as Parameters<typeof transmit.broadcast>[1]
        transmit.broadcast(`notifications/${notification.userId}`, payload)
      } catch (error) {
        logger.warn({ err: error }, 'failed to broadcast notification via SSE')
      }
    }

    const wantsPush = channels.push && isPushableNotificationType(notification.type)
    if (!wantsPush && !channels.email) return notification
    const recipient = await this.dispatcher.recipient(notification.userId)
    if (!recipient) return notification

    // Web Push (#497) — même contrat que le broadcast SSE : un échec de
    // dispatch ne doit jamais faire échouer la création de la notification.
    // Les heures calmes (#888) sont tenues par le dispatcher.
    if (wantsPush) {
      try {
        await this.dispatcher.push(notification, recipient)
      } catch (error) {
        logger.warn({ err: error }, 'failed to dispatch push notification job')
      }
    }

    // E-mail (#888) — opt-in par famille, immédiat ou en résumé quotidien.
    if (channels.email) {
      try {
        await this.dispatcher.email(notification, recipient)
      } catch (error) {
        logger.warn({ err: error }, 'failed to dispatch notification email')
      }
    }

    return notification
  }

  /**
   * Crée une notification sauf s'il en existe déjà une récente du même `type`
   * pour le même utilisateur et la même entité (identifiée par une clé de
   * `metadata`, ex: `boatId`). Anti-doublon des notifications planifiées : un
   * scan quotidien sur une condition persistante (maintenance en retard,
   * document expiré…) ne re-notifie pas chaque jour. Portable Postgres/SQLite
   * (le filtrage sur `metadata` se fait en mémoire). Retourne `null` si un
   * doublon récent existe.
   */
  async createIfNotRecent(
    params: CreateNotificationParams,
    dedupe: { metadataKey: string; withinDays: number }
  ): Promise<Notification | null> {
    const since = DateTime.now().minus({ days: dedupe.withinDays })
    const recent = await Notification.query()
      .where('userId', params.userId)
      .where('type', params.type)
      .where('createdAt', '>=', since.toSQL()!)

    const value = params.metadata?.[dedupe.metadataKey]
    const hasDuplicate = recent.some((n) => n.metadata?.[dedupe.metadataKey] === value)
    if (hasDuplicate) return null

    return this.create(params)
  }

  async getUnreadCount(userId: number): Promise<number> {
    const result = await Notification.query()
      .where('userId', userId)
      .where('inApp', true)
      .whereNull('readAt')
      .count('* as total')
    return Number(result[0].$extras.total)
  }

  async getRecentUnread(userId: number, limit = 5): Promise<Notification[]> {
    return Notification.query()
      .where('userId', userId)
      .where('inApp', true)
      .whereNull('readAt')
      .orderBy('createdAt', 'desc')
      .limit(limit)
  }

  async sharedProps(userId: number): Promise<NotificationsSharedProps> {
    const [unreadCount, recent] = await Promise.all([
      this.getUnreadCount(userId),
      this.getRecentUnread(userId),
    ])
    return {
      unreadCount,
      recent: recent.map(NotificationTransformer.toRow),
    }
  }

  async listForUser(userId: number, page: number, perPage = 20) {
    return Notification.query()
      .where('userId', userId)
      .where('inApp', true)
      .orderBy('createdAt', 'desc')
      .paginate(page, perPage)
  }

  async markRead(userId: number, notificationId: number): Promise<void> {
    const notif = await Notification.query()
      .where('id', notificationId)
      .where('userId', userId)
      .firstOrFail()
    if (!notif.readAt) {
      notif.readAt = DateTime.now()
      await notif.save()
    }
  }

  async markAllRead(userId: number): Promise<void> {
    await Notification.query()
      .where('userId', userId)
      .whereNull('readAt')
      .update({ readAt: DateTime.now() })
  }

  async destroy(userId: number, notificationId: number): Promise<void> {
    await Notification.query().where('id', notificationId).where('userId', userId).delete()
  }
}
