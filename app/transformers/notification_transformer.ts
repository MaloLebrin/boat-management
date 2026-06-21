import type Notification from '#models/notification'
import type { JsonObject, NotificationForFront } from '#shared/types/notification'

export function toRow(notification: Notification): NotificationForFront {
  return {
    id: notification.id,
    type: notification.type,
    severity: notification.severity,
    title: notification.title,
    body: notification.body,
    actionUrl: notification.actionUrl,
    metadata: notification.metadata as JsonObject | null,
    readAt: notification.readAt?.toISO() ?? null,
    isRead: notification.isRead,
    createdAt: notification.createdAt.toISO()!,
  }
}
