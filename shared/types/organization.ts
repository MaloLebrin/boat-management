export type OrgRole = 'admin' | 'member'

export type InvitationStatus = 'pending' | 'accepted' | 'cancelled'

export interface OrganizationMemberData {
  id: number
  userId: number
  fullName: string | null
  email: string
  role: OrgRole
}

export interface OrganizationInvitationData {
  id: number
  email: string
  role: OrgRole
  status: InvitationStatus
  invitedByName: string | null
  expiresAt: string
  createdAt: string
}
