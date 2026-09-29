import type { DateTime } from 'luxon'
import type { NavigationTitle } from './navigation_title.js'

/**
 * Les certifications d'équipage puisent dans le vocabulaire partagé des titres
 * de navigation (#585) — même liste que les permis clients, pas une liste
 * voisine à entretenir.
 */
export type CrewCertificationType = NavigationTitle

export type NavigationLogCrewRole = 'skipper' | 'crew' | 'passenger'

/**
 * État d'une certification (#882) : `expiring_soon` dans les 60 jours,
 * `undated` sans date d'expiration (permis à vie, date non saisie).
 * Calculé par `crewCertificationStatus` (`shared/helpers/crew_certification.ts`).
 */
export type CrewCertificationStatus = 'valid' | 'expiring_soon' | 'expired' | 'undated'

export interface CreateCrewMemberPayload {
  firstName: string
  lastName: string
  email?: string | null
  phone?: string | null
  notes?: string | null
}

export interface UpdateCrewMemberPayload {
  firstName: string
  lastName: string
  email?: string | null
  phone?: string | null
  notes?: string | null
}

export interface CreateCrewCertificationPayload {
  type: CrewCertificationType
  referenceNumber?: string | null
  expiresAt?: Date | string | DateTime | null
}

export interface SyncNavigationLogCrewPayload {
  crew: Array<{
    crewMemberId: number
    role: NavigationLogCrewRole
  }>
}

export interface CrewCertificationRow {
  id: number
  type: CrewCertificationType
  referenceNumber: string | null
  expiresAt: string | null
  isExpired: boolean
  expiresInDays: number | null
  status: CrewCertificationStatus
}

export interface CrewMemberRow {
  id: number
  firstName: string
  lastName: string
  fullName: string
  email: string | null
  phone: string | null
  notes: string | null
  certifications: CrewCertificationRow[]
  /** État le plus grave de ses certifications, `null` s'il n'en a aucune (#882). */
  certificationStatus: CrewCertificationStatus | null
}

export interface NavigationLogCrewRow {
  crewMemberId: number
  fullName: string
  role: NavigationLogCrewRole
}

export interface CrewMemberOption {
  id: number
  fullName: string
  /**
   * État le plus grave de ses certifications (#882) : le sélecteur d'équipage
   * du journal de bord avertit — sans bloquer — quand on embarque un équipier
   * au certificat échu.
   */
  certificationStatus: CrewCertificationStatus | null
}

/** Une certification à renouveler, telle que listée par le widget, l'assistant et l'e-mail. */
export interface CrewCertificationAlert {
  crewMemberId: number
  crewMemberName: string
  certificationId: number
  type: CrewCertificationType
  /** `YYYY-MM-DD`. */
  expiresAt: string
  /** Négatif une fois échue. */
  expiresInDays: number
  status: 'expiring_soon' | 'expired'
}

/** Widget « Certifications à renouveler » du tableau de bord (#882). */
export interface DashboardCrewCertifications {
  expiredCount: number
  expiringSoonCount: number
  /** Les plus urgentes d'abord (échues, puis par échéance), plafonnées. */
  items: CrewCertificationAlert[]
}
