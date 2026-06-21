// Tous les types actuels ET futurs — extensible par design
export type NotificationType =
  | 'quota.ai_tokens'
  | 'quota.storage'
  | 'member.joined'
  | 'member.removed'
  | 'member.role_changed'
  | 'plan.downgraded'
  | 'plan.upgraded'
  | 'maintenance.overdue'
  | 'maintenance.due_soon'
  | 'document.expiring_soon'
  | 'document.expired'
  | 'safety_equipment.expiring_soon'
  | 'safety_equipment.expired'
  | 'invitation.accepted'
  | (string & {}) // extensible pour les futurs types sans casser le type

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error'

export interface NotificationForFront {
  id: number
  type: NotificationType
  severity: NotificationSeverity
  title: string
  body: string | null
  actionUrl: string | null
  metadata: Record<string, unknown> | null
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
