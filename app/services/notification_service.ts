import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import Notification from '#models/notification'
import type { CreateNotificationParams, NotificationsSharedProps } from '#shared/types/notification'
import * as NotificationTransformer from '#transformers/notification_transformer'
import transmit from '@adonisjs/transmit/services/main'

@inject()
export default class NotificationService {
  async create(params: CreateNotificationParams): Promise<Notification> {
    const notification = await Notification.create({
      userId: params.userId,
      organizationId: params.organizationId,
      type: params.type,
      severity: params.severity ?? 'info',
      title: params.title,
      body: params.body ?? null,
      actionUrl: params.actionUrl ?? null,
      metadata: params.metadata ?? null,
    })

    try {
      transmit.broadcast(`notifications/${notification.userId}`, {
        notification: NotificationTransformer.toRow(notification),
      } as unknown as Record<string, string>)
    } catch (error) {
      logger.warn({ err: error }, 'failed to broadcast notification via SSE')
    }

    return notification
  }

  async getUnreadCount(userId: number): Promise<number> {
    const result = await Notification.query()
      .where('userId', userId)
      .whereNull('readAt')
      .count('* as total')
    return Number(result[0].$extras.total)
  }

  async getRecentUnread(userId: number, limit = 5): Promise<Notification[]> {
    return Notification.query()
      .where('userId', userId)
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
      .update({ readAt: DateTime.now().toUTC().toISO()! })
  }

  async destroy(userId: number, notificationId: number): Promise<void> {
    await Notification.query().where('id', notificationId).where('userId', userId).delete()
  }
}
