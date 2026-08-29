import type { DateTime } from 'luxon'
import type { NavigationTitle } from './navigation_title.js'

/**
 * Les certifications d'équipage puisent dans le vocabulaire partagé des titres
 * de navigation (#585) — même liste que les permis clients, pas une liste
 * voisine à entretenir.
 */
export type CrewCertificationType = NavigationTitle

export type NavigationLogCrewRole = 'skipper' | 'crew' | 'passenger'

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
}

export interface NavigationLogCrewRow {
  crewMemberId: number
  fullName: string
  role: NavigationLogCrewRole
}

export interface CrewMemberOption {
  id: number
  fullName: string
}
