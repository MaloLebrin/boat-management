export type CrewCertificationType =
  | 'coastal_permit'
  | 'offshore_permit'
  | 'vhf'
  | 'stcw_basic'
  | 'stcw_proficiency'
  | 'other'

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
  expiresAt?: string | null
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
