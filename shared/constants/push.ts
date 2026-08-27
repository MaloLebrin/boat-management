import type { NotificationType } from '../types/notification.js'

/**
 * Sous-ensemble poussable de `NotificationType` (#497) : tout ne mérite pas une
 * notification système. Les événements de terrain (maintenance, documents,
 * équipements de sécurité) sortent de l'app ; la vie du compte (membres, plan,
 * quotas) reste in-app.
 */
export const PUSHABLE_NOTIFICATION_TYPES: readonly NotificationType[] = [
  'maintenance.overdue',
  'maintenance.due_soon',
  'document.expiring_soon',
  'document.expired',
  'safety_equipment.expiring_soon',
  'safety_equipment.expired',
] as const

export function isPushableNotificationType(type: NotificationType): boolean {
  return PUSHABLE_NOTIFICATION_TYPES.includes(type)
}
