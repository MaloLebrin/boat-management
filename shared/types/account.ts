import type { OrgRole } from '#shared/types/organization'

/**
 * Gestion du compte en libre-service (#886) : export de ses données, quitter
 * une organisation, supprimer son compte ou son organisation.
 */

/** Pourquoi une organisation ne peut pas être quittée. */
export type LeaveBlockedReason = 'last_admin' | 'only_organization'

/** Une adhésion, dans la zone « Mes organisations » de `/settings/me`. */
export interface AccountMembershipRow {
  organizationId: number
  name: string
  role: OrgRole
  isCurrent: boolean
  leaveBlockedReason: LeaveBlockedReason | null
}

/** Props de la zone dangereuse de `/settings/me`. */
export interface AccountSettingsProps {
  memberships: AccountMembershipRow[]
  /** Organisations dont l'utilisateur est le dernier admin : bloquent la suppression. */
  lastAdminOf: string[]
  graceDays: number
}

/** Props de la zone dangereuse de `/settings/org`. */
export interface OrganizationDeletionProps {
  /** Date de purge (ISO) si la suppression est programmée, sinon `null`. */
  scheduledFor: string | null
  graceDays: number
}

/** Fichier « Exporter mes données » (portabilité, art. 20 RGPD). */
export interface PersonalDataExport {
  format: 'fleetai.personal-data'
  version: 1
  exportedAt: string
  profile: {
    id: number
    email: string
    fullName: string | null
    locale: string | null
    theme: string | null
    emailVerifiedAt: string | null
    twoFactorEnabled: boolean
    notifyNewLogin: boolean
    lastLoginAt: string | null
    createdAt: string
  }
  memberships: { organizationId: number; organization: string; role: string; since: string }[]
  sessions: {
    ipAddress: string | null
    userAgent: string | null
    createdAt: string
    lastSeenAt: string | null
    revokedAt: string | null
  }[]
  pushSubscriptions: { userAgent: string | null; createdAt: string; lastUsedAt: string | null }[]
  notifications: {
    type: string
    title: string
    body: string | null
    readAt: string | null
    createdAt: string
  }[]
  auditLog: {
    organizationId: number
    action: string
    entityType: string | null
    entityId: number | null
    metadata: unknown
    createdAt: string
  }[]
  /** Saisies dont l'utilisateur est l'auteur (le contenu reste à l'organisation). */
  authored: {
    incidents: { id: number; boatId: number; type: string; occurredAt: string | null }[]
    equipmentActions: { id: number; boatId: number; label: string; createdAt: string }[]
    statusChanges: {
      boatId: number
      fromStatus: string | null
      toStatus: string
      createdAt: string
    }[]
    media: { entityType: string; originalFilename: string; createdAt: string }[]
  }
  assistantConversations: { createdAt: string; messages: unknown }[]
}
