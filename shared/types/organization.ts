export type OrgRole = 'admin' | 'member'

export interface OrganizationMemberData {
  id: number
  userId: number
  fullName: string | null
  email: string
  role: OrgRole
}
