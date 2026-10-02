export interface JsonObject {
  [key: string]: JsonValue
}
export type JsonValue = string | number | boolean | null | JsonObject | JsonValue[]

// Tous les types actuels ET futurs — extensible par design
export type NotificationType =
  | 'quota.ai_tokens'
  | 'quota.storage'
  | 'member.joined'
  | 'member.removed'
  | 'member.role_changed'
  | 'plan.downgraded'
  | 'plan.upgraded'
  | 'module.deactivated'
  | 'maintenance.overdue'
  | 'maintenance.due_soon'
  | 'maintenance.assigned'
  | 'document.expiring_soon'
  | 'document.expired'
  | 'safety_equipment.expiring_soon'
  | 'safety_equipment.expired'
  | 'crew_certification.expiring_soon'
  | 'crew_certification.expired'
  | 'crew.assigned'
  | 'crew.assignment_reminder'
  | 'invitation.accepted'
  | 'ai.suggestions_ready'
  | 'boat.status_changed'
  | 'boat.available_again'
  | 'reservation.deposit_due'
  | 'reservation.balance_due'
  | 'reservation.requested'
  | 'reservation.created'
  | 'reservation.confirmed'
  | 'reservation.cancelled'
  | 'reservation.starts_tomorrow'
  | 'incident.created'
  | 'incident.resolved'
  | 'invoice.paid'
  | 'invoice.paid_online'
  | 'invoice.overdue'
  | 'invoice.reminder_sent'
  | 'invoice.reminder_skipped'
  | 'export.ready'
  | 'export.failed'
  | (string & {}) // extensible pour les futurs types sans casser le type

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error'

export interface NotificationForFront {
  id: number
  type: NotificationType
  severity: NotificationSeverity
  title: string
  body: string | null
  actionUrl: string | null
  metadata: JsonObject | null
  readAt: string | null
  isRead: boolean
  createdAt: string
}

export interface NotificationsSharedProps {
  unreadCount: number
  recent: NotificationForFront[]
}

export interface NotificationsPage {
  data: NotificationForFront[]
  meta: {
    total: number
    perPage: number
    currentPage: number
    lastPage: number
  }
}

export interface CreateNotificationParams {
  userId: number
  organizationId: number
  type: NotificationType
  severity?: NotificationSeverity
  title: string
  body?: string | null
  actionUrl?: string | null
  metadata?: Record<string, unknown> | null
}

/**
 * Familles de notifications (#888) : l'unité des préférences. Chaque type
 * appartient à une famille (`notificationFamilyOf`).
 */
export type NotificationFamily = 'fleet' | 'rental' | 'billing' | 'team' | 'ai'

/** Canaux de livraison d'une notification (#888). */
export type NotificationChannel = 'inApp' | 'push' | 'email'

export type NotificationChannelPreferences = Record<NotificationChannel, boolean>

export type NotificationPreferenceMatrix = Record<
  NotificationFamily,
  NotificationChannelPreferences
>

/** Prop `preferences` de `/settings/notifications` (#888). */
export interface NotificationPreferencesProps {
  families: NotificationPreferenceMatrix
  quietHours: boolean
  emailDigest: boolean
  timezone: string
}

export interface UpdateNotificationPreferencesPayload {
  families: NotificationPreferenceMatrix
  quietHours: boolean
  emailDigest: boolean
  timezone: string
}

/** Une ligne du résumé quotidien des e-mails (#888). */
export interface NotificationDigestEntry {
  title: string
  body: string | null
  actionUrl: string | null
}
