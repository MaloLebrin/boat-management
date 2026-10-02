import OrganizationMembership from '#models/organization_membership'
import type { OrgRole } from '#shared/types/organization'

/** Rôles de l'équipe : tout le monde sauf le propriétaire, qui a son portail. */
const STAFF_ROLES: readonly OrgRole[] = ['admin', 'member', 'mechanic']

export interface NotificationAudienceMember {
  userId: number
  locale: string | null
}

/**
 * Destinataires des événements d'équipe (#888) : réservation, incident,
 * facture. On vise toute l'équipe et on laisse les préférences trier — les
 * défauts du rôle disent qui suit quoi (`DEFAULT_NOTIFICATION_PREFERENCES`).
 */
export default class NotificationAudienceService {
  async staffOf(
    organizationId: number,
    exceptUserId: number | null
  ): Promise<NotificationAudienceMember[]> {
    const memberships = await OrganizationMembership.query()
      .where('organizationId', organizationId)
      .whereIn('role', [...STAFF_ROLES])
      .preload('user', (query) => query.select('id', 'locale', 'anonymizedAt'))
    return memberships
      .filter((m) => m.userId !== exceptUserId && m.user.anonymizedAt === null)
      .map((m) => ({ userId: m.userId, locale: m.user.locale }))
  }
}
