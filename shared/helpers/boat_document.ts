import { BOAT_DOCUMENT_EXPIRY_WARNING_DAYS } from '#shared/constants/boats/boat_document_constants'
import type { BoatDocumentStatus } from '#shared/types/boat_document'

const DAY_MS = 86_400_000

/**
 * Statut d'un document à partir de sa date d'expiration et du jour courant,
 * tous deux en dates civiles `YYYY-MM-DD` : `expired` la veille de l'échéance,
 * `expiring_soon` à moins de `BOAT_DOCUMENT_EXPIRY_WARNING_DAYS` jours, sinon
 * `valid`. Partagé entre `BoatDocumentService` (liste d'un bateau) et le
 * tableau de bord (#832) pour qu'un même document n'ait qu'un statut.
 */
export function documentStatusFor(
  expiresAtIso: string | null,
  todayIso: string
): BoatDocumentStatus {
  if (!expiresAtIso) return 'valid'
  const daysUntil = Math.floor((Date.parse(expiresAtIso) - Date.parse(todayIso)) / DAY_MS)
  if (daysUntil < 0) return 'expired'
  if (daysUntil < BOAT_DOCUMENT_EXPIRY_WARNING_DAYS) return 'expiring_soon'
  return 'valid'
}
