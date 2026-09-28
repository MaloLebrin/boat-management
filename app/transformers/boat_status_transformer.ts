import type BoatStatusChange from '#models/boat_status_change'
import { formatDate } from '#shared/helpers/date_format'
import type { BoatStatusChangeRow, BoatUnavailabilityWindow } from '#shared/types/boat_status'
import type { I18n } from '@adonisjs/i18n'

export function toBoatStatusChangeRow(change: BoatStatusChange): BoatStatusChangeRow {
  return {
    id: change.id,
    fromStatus: change.fromStatus,
    toStatus: change.toStatus,
    reason: change.reason,
    userName: change.user ? change.user.fullName || change.user.email : null,
    createdAt: change.createdAt.toISO()!,
  }
}

/**
 * Motifs d'indisponibilité en une phrase, pour le flash d'une réservation
 * refusée (#870) : « bateau hors service, tâche « Vidange » le 12/10/2026 ».
 */
export function describeUnavailability(windows: BoatUnavailabilityWindow[], i18n: I18n): string {
  return windows
    .map((window) => {
      switch (window.source) {
        case 'status':
          return i18n.t('flash.reservation.unavailableReason.status', {
            status: i18n.t(`boats.availability.status.${window.label}`).toLowerCase(),
          })
        case 'task':
          return i18n.t('flash.reservation.unavailableReason.task', {
            title: window.label,
            date: window.startsAt ? formatDate(window.startsAt.slice(0, 10), i18n.locale) : '—',
          })
        case 'incident':
          return i18n.t('flash.reservation.unavailableReason.incident', {
            type: i18n.t(`incidents.type.${window.label}`).toLowerCase(),
          })
      }
    })
    .join(', ')
}
