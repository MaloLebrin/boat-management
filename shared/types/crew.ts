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

/**
 * Rôle d'un équipier affecté à une réservation (#883). `instructor` pour les
 * écoles de voile ; il devient `crew` dans le journal de bord, qui ne connaît
 * que skipper, équipier et passager.
 */
export const RESERVATION_CREW_ROLES = ['skipper', 'crew', 'instructor'] as const
export type ReservationCrewRole = (typeof RESERVATION_CREW_ROLES)[number]

export interface AssignReservationCrewPayload {
  crewMemberId: number
  role: ReservationCrewRole
  notes?: string | null
}

/**
 * Ce qui empêche d'embarquer un équipier sur un créneau (#883) : une autre
 * réservation qui le recoupe, ou une indisponibilité déclarée.
 */
export interface CrewConflict {
  kind: 'reservation' | 'unavailability'
  id: number
  /** ISO — début de la réservation, ou `YYYY-MM-DD` de l'indisponibilité. */
  startsAt: string
  endsAt: string
  /** Bateau et client de la réservation, ou motif de l'indisponibilité. */
  label: string | null
}

/** Un équipier affecté à une réservation, tel qu'affiché sur son bloc « Équipage ». */
export interface ReservationCrewRow {
  id: number
  crewMemberId: number
  fullName: string
  email: string | null
  role: ReservationCrewRole
  notes: string | null
  certificationStatus: CrewCertificationStatus | null
  /** Une certification datée expire avant la fin de la réservation. */
  certificationLapses: boolean
  /** Chevauchements apparus depuis l'affectation (réservation déplacée…). */
  conflicts: CrewConflict[]
}

/** Équipier proposé par le sélecteur d'une réservation, libre ou non sur ses dates. */
export interface CrewAvailabilityRow {
  id: number
  fullName: string
  certificationStatus: CrewCertificationStatus | null
  certificationLapses: boolean
  available: boolean
  conflicts: CrewConflict[]
}

/** Avertissement non bloquant renvoyé par une affectation (#883). */
export type CrewAssignmentWarning = 'certification_lapses' | null

export interface CreateCrewUnavailabilityPayload {
  /** `YYYY-MM-DD`, bornes comprises. */
  startsOn: string
  endsOn: string
  reason?: string | null
}

export interface CrewUnavailabilityRow {
  id: number
  startsOn: string
  endsOn: string
  reason: string | null
}

/** Une case du calendrier d'équipage : embarquement ou indisponibilité. */
export interface CrewPlanningEntry {
  kind: 'reservation' | 'unavailability'
  id: number
  /** ISO pour une réservation, `YYYY-MM-DD` pour une indisponibilité. */
  startsAt: string
  endsAt: string
  label: string | null
  role: ReservationCrewRole | null
  boatId: number | null
  boatName: string | null
}

export interface CrewPlanningRow {
  crewMemberId: number
  fullName: string
  certificationStatus: CrewCertificationStatus | null
  entries: CrewPlanningEntry[]
}

/** Calendrier `/crew/planning` : une ligne par équipier sur la période. */
export interface CrewPlanning {
  /** `YYYY-MM-DD`, premier et dernier jour affichés. */
  from: string
  to: string
  rows: CrewPlanningRow[]
}

/** Un embarquement passé ou à venir, sur la fiche d'un équipier. */
export interface CrewMemberHistoryEntry {
  kind: 'reservation' | 'navigation_log'
  id: number
  boatId: number
  boatName: string
  startsAt: string
  endsAt: string | null
  role: ReservationCrewRole | NavigationLogCrewRole
  /** Client de la réservation, port de départ d'une sortie. */
  label: string | null
}

/** Affectation à venir, pour l'assistant (« qui skippe le catamaran samedi ? »). */
export interface UpcomingCrewAssignment {
  reservationId: number
  boatName: string
  clientName: string
  startsAt: string
  endsAt: string
  crewMemberName: string
  role: ReservationCrewRole
}
