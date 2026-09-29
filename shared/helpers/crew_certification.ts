import type { CrewCertificationStatus } from '#shared/types/crew'

/**
 * Fenêtres d'alerte des certifications d'équipage (#882), en jours avant
 * l'expiration. Un certificat médical ou un STCW se renouvelle en plusieurs
 * semaines : la première alerte part deux mois avant, puis à un mois et à
 * une semaine. Triées par ordre décroissant.
 */
export const CREW_CERT_ALERT_WINDOWS = [60, 30, 7] as const

export type CrewCertAlertWindow = (typeof CREW_CERT_ALERT_WINDOWS)[number]

/** Au-delà de cette échéance, une certification datée est « valide ». */
export const CREW_CERT_EXPIRING_SOON_DAYS = CREW_CERT_ALERT_WINDOWS[0]

/**
 * État d'une certification à partir du nombre de jours restants (négatif une
 * fois échue, `null` sans date d'expiration). Même règle pour le badge de
 * `/crew`, le sélecteur d'équipage du journal de bord, le widget du tableau de
 * bord et le scan de notifications — sans luxon, pour rester importable côté
 * Inertia.
 */
export function crewCertificationStatus(expiresInDays: number | null): CrewCertificationStatus {
  if (expiresInDays === null) return 'undated'
  if (expiresInDays < 0) return 'expired'
  if (expiresInDays <= CREW_CERT_EXPIRING_SOON_DAYS) return 'expiring_soon'
  return 'valid'
}

/**
 * Plus petite fenêtre d'alerte qui contient l'échéance (`45` → `60`, `12` →
 * `30`, `3` → `7`), `null` hors fenêtre ou déjà échue. C'est la clé
 * anti-doublon du scan : une certification n'alerte qu'une fois par fenêtre.
 */
export function crewCertificationAlertWindow(
  expiresInDays: number | null
): CrewCertAlertWindow | null {
  if (expiresInDays === null || expiresInDays < 0) return null
  let window: CrewCertAlertWindow | null = null
  for (const candidate of CREW_CERT_ALERT_WINDOWS) {
    if (expiresInDays <= candidate) window = candidate
  }
  return window
}

const STATUS_WEIGHT: Record<CrewCertificationStatus, number> = {
  expired: 3,
  expiring_soon: 2,
  valid: 1,
  undated: 0,
}

/**
 * État le plus grave d'un ensemble de certifications — celui d'un équipier.
 * `null` quand il n'en a aucune (rien à signaler, pas « valide »).
 */
export function worstCrewCertificationStatus(
  statuses: CrewCertificationStatus[]
): CrewCertificationStatus | null {
  let worst: CrewCertificationStatus | null = null
  for (const status of statuses) {
    if (worst === null || STATUS_WEIGHT[status] > STATUS_WEIGHT[worst]) worst = status
  }
  return worst
}
