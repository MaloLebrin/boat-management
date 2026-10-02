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
  'maintenance.assigned',
  // Disponibilité d'un bateau (#870) : un événement de terrain, comme la maintenance.
  'boat.status_changed',
  'boat.available_again',
  // Argent des locations (#875) : à réclamer avant le départ.
  'reservation.deposit_due',
  'reservation.balance_due',
  // Demande en ligne d'un client (#881) : un client attend une réponse.
  'reservation.requested',
  // Vie des réservations et incidents signalés (#888) : l'équipe qui prépare
  // le bateau doit le savoir sans ouvrir l'app. La clôture d'un incident et le
  // règlement manuel d'une facture restent in-app : personne n'a à agir.
  'reservation.created',
  'reservation.confirmed',
  'reservation.cancelled',
  'reservation.starts_tomorrow',
  'incident.created',
  // Facture réglée en ligne par le client (#876) : de l'argent arrivé.
  'invoice.paid_online',
  // Facture passée en retard (#878) : de l'argent qui n'est pas arrivé. Les
  // relances envoyées restent in-app, le job en fait une par facture et palier.
  'invoice.overdue',
  'document.expiring_soon',
  'document.expired',
  'safety_equipment.expiring_soon',
  'safety_equipment.expired',
  // Certification d'équipage échue (#882) : un équipier qu'on ne peut plus
  // embarquer. L'échéance à venir reste in-app, comme les autres rappels.
  'crew_certification.expired',
  // Embarquement d'un équipier (#883) : il doit savoir qu'il part, et la veille.
  'crew.assigned',
  'crew.assignment_reminder',
] as const

export function isPushableNotificationType(type: NotificationType): boolean {
  return PUSHABLE_NOTIFICATION_TYPES.includes(type)
}
