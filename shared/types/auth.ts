import type { OrgRole } from './organization.js'

export interface AuthState {
  userId: number
  email: string
  fullName: string | null
  locale: string
  organizationId: number | null
  role: OrgRole | null
}

export interface SharedData {
  auth: AuthState | null
  flash: {
    success?: string
    error?: string
  }
  locale: string
}
