/**
 * Statut de disponibilité d'un bateau (#870).
 *
 * - `available` — louable, état par défaut ;
 * - `in_maintenance` / `out_of_service` — immobilisé : une réservation
 *   **confirmée** ne peut plus être posée dessus (une option reste possible) ;
 * - `sold` — sorti de la flotte active : plus aucune réservation, retiré de la
 *   liste par défaut et du quota de bateaux, historique conservé.
 */
export const BOAT_STATUSES = ['available', 'in_maintenance', 'out_of_service', 'sold'] as const
export type BoatStatus = (typeof BOAT_STATUSES)[number]

/** Statuts qui immobilisent le bateau (bloquent une réservation confirmée). */
export const IMMOBILIZING_BOAT_STATUSES: readonly BoatStatus[] = [
  'in_maintenance',
  'out_of_service',
  'sold',
]

export function isBoatStatus(value: unknown): value is BoatStatus {
  return typeof value === 'string' && (BOAT_STATUSES as readonly string[]).includes(value)
}

/**
 * Types d'incident qui immobilisent le bateau tant qu'ils sont ouverts (#870).
 * Un vol/vandalisme ou un « autre » ne rend pas forcément le bateau
 * inutilisable : il n'entre pas dans les fenêtres d'indisponibilité.
 */
export const IMMOBILIZING_INCIDENT_TYPES = [
  'grounding',
  'flooding',
  'rigging_failure',
  'engine_failure',
  'collision',
  'fire',
] as const

/** Durée d'immobilisation prêtée à une tâche datée sans durée prévue. */
export const DEFAULT_TASK_UNAVAILABILITY_DAYS = 1

export type BoatUnavailabilitySource = 'status' | 'task' | 'incident'

/**
 * Une fenêtre d'indisponibilité calculée : `endsAt === null` = ouverte (tant
 * que le statut, l'incident… n'a pas changé). Dates ISO.
 */
export interface BoatUnavailabilityWindow {
  source: BoatUnavailabilitySource
  startsAt: string | null
  endsAt: string | null
  /** Statut du bateau, titre de la tâche ou type d'incident selon la source. */
  label: string
  /** Id de la tâche ou de l'incident — `null` pour le statut. */
  refId: number | null
}

export interface BoatAvailabilitySummary {
  status: BoatStatus
  statusReason: string | null
  statusChangedAt: string | null
  /** Fenêtres courantes et à venir (horizon borné côté serveur). */
  windows: BoatUnavailabilityWindow[]
}

export interface BoatStatusChangeRow {
  id: number
  fromStatus: BoatStatus
  toStatus: BoatStatus
  reason: string | null
  userName: string | null
  createdAt: string
}

export interface ChangeBoatStatusPayload {
  status: BoatStatus
  reason?: string | null
}
