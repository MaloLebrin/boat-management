import type { OrgRole } from '../types/organization.js'
import type {
  NotificationChannel,
  NotificationChannelPreferences,
  NotificationFamily,
  NotificationPreferenceMatrix,
  NotificationSeverity,
  NotificationType,
} from '../types/notification.js'

/**
 * Préférences de notifications (#888) : chaque type appartient à une famille,
 * et l'utilisateur règle, par famille, les trois canaux (in-app, push,
 * e-mail). L'ordre est celui de la matrice de `/settings/notifications`.
 */
export const NOTIFICATION_FAMILIES: readonly NotificationFamily[] = [
  'fleet',
  'rental',
  'billing',
  'team',
  'ai',
] as const

export const NOTIFICATION_CHANNELS: readonly NotificationChannel[] = [
  'inApp',
  'push',
  'email',
] as const

/**
 * Famille d'un type, par son préfixe. Un préfixe inconnu tombe dans `team`
 * (vie du compte) : un futur type reste réglable sans toucher à ce fichier.
 */
const FAMILY_BY_PREFIX: Record<string, NotificationFamily> = {
  maintenance: 'fleet',
  boat: 'fleet',
  document: 'fleet',
  safety_equipment: 'fleet',
  incident: 'fleet',
  // Portail propriétaire (#890) : tout ce qui touche son bateau, facture comprise
  // — `billing` est coupée par défaut chez le propriétaire, qui n'y reçoit rien d'autre.
  owner: 'fleet',
  reservation: 'rental',
  invoice: 'billing',
  quota: 'billing',
  plan: 'billing',
  module: 'billing',
  ai: 'ai',
}

export function notificationFamilyOf(type: NotificationType): NotificationFamily {
  const prefix = type.split('.')[0]
  return FAMILY_BY_PREFIX[prefix] ?? 'team'
}

export function isNotificationFamily(value: unknown): value is NotificationFamily {
  return typeof value === 'string' && (NOTIFICATION_FAMILIES as readonly string[]).includes(value)
}

const ALL: NotificationChannelPreferences = { inApp: true, push: true, email: false }
const OFF: NotificationChannelPreferences = { inApp: false, push: false, email: false }

/**
 * Défauts par rôle, tant que l'utilisateur n'a rien enregistré. L'e-mail est
 * un choix explicite (jamais coché d'office) ; in-app et push suivent ce que
 * le rôle a à faire : le mécanicien n'a rien à suivre de la location ni de la
 * facturation, le propriétaire suit son bateau et son équipage.
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: Record<OrgRole, NotificationPreferenceMatrix> = {
  admin: { fleet: ALL, rental: ALL, billing: ALL, team: ALL, ai: ALL },
  member: { fleet: ALL, rental: ALL, billing: OFF, team: ALL, ai: ALL },
  mechanic: { fleet: ALL, rental: OFF, billing: OFF, team: ALL, ai: ALL },
  boat_owner: { fleet: ALL, rental: OFF, billing: OFF, team: ALL, ai: OFF },
}

/** Heures calmes du push : de 22h à 7h, dans le fuseau de l'utilisateur. */
export const NOTIFICATION_QUIET_HOURS = { start: 22, end: 7 } as const

/** Heure d'envoi du résumé quotidien des e-mails, dans le fuseau de l'utilisateur. */
export const NOTIFICATION_DIGEST_HOUR = 8

/** Fuseau par défaut, celui des crons de l'app. */
export const DEFAULT_NOTIFICATION_TIMEZONE = 'Europe/Paris'

/**
 * Une notification urgente (`error` : quota dépassé, export en échec…)
 * part tout de suite par e-mail, même quand le résumé quotidien est activé.
 */
export function isUrgentNotification(severity: NotificationSeverity): boolean {
  return severity === 'error'
}

/** Vrai si `hour` (0-23, heure locale) tombe dans les heures calmes. */
export function isQuietHour(hour: number): boolean {
  return hour >= NOTIFICATION_QUIET_HOURS.start || hour < NOTIFICATION_QUIET_HOURS.end
}
