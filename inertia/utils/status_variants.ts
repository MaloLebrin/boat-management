/**
 * Variantes de `BaseBadge` par statut métier (vague 3.3). Une seule
 * correspondance par vocabulaire, partagée par les cartes de la fiche bateau,
 * les pages d'équipement, les listes et les inventaires — au lieu d'une copie
 * locale par composant (quatorze `statusVariant`, trois `wearStateVariant`,
 * deux `maintenanceVariant` avant cette vague).
 */
export type BadgeVariant = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

/** Statut d'un équipement mécanique ou de gréement : moteur, voile, gréement. */
export function equipmentStatusVariant(status: string): BadgeVariant {
  if (status === 'operational') return 'success'
  if (status === 'in_maintenance') return 'info'
  if (status === 'out_of_service') return 'warning'
  return 'neutral'
}

/** Alias historique de `equipmentStatusVariant` (inventaire des moteurs, #598). */
export const engineStatusVariant = equipmentStatusVariant

/** Statut d'un équipement de sécurité ou générique : conforme, à vérifier, sinon en défaut. */
export function safetyStatusVariant(status: string): BadgeVariant {
  if (status === 'ok') return 'success'
  if (status === 'to_check') return 'warning'
  return 'danger'
}

/** État d'usure d'une pièce moteur. */
export function wearStateVariant(state: string): BadgeVariant {
  if (state === 'new') return 'success'
  if (state === 'good') return 'info'
  if (state === 'worn') return 'warning'
  if (state === 'to_replace') return 'danger'
  return 'neutral'
}

/** Pastille d'entretien d'un bateau dans la liste de la flotte. */
export function maintenanceVariant(maintenance: {
  urgentCount: number
  upcomingCount: number
}): BadgeVariant {
  if (maintenance.urgentCount > 0) return 'warning'
  if (maintenance.upcomingCount > 0) return 'info'
  return 'neutral'
}

/** Statut d'un incident de navigation. */
export function incidentStatusVariant(status: string): BadgeVariant {
  if (status === 'open') return 'danger'
  if (status === 'in_progress') return 'warning'
  return 'neutral'
}

/** Validité d'un document administratif du bateau (#461). */
export function documentStatusVariant(status: string): BadgeVariant {
  if (status === 'valid') return 'success'
  if (status === 'expiring_soon') return 'warning'
  if (status === 'expired') return 'danger'
  return 'neutral'
}
