import OrganizationMembership from '#models/organization_membership'
import User from '#models/user'
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

  /**
   * Propriétaires rattachés à un bateau (#890), par le pivot `boat_owners` :
   * jamais la flotte, seulement ceux de ce bateau, et toujours membres
   * `boat_owner` de son organisation.
   */
  async ownersOfBoat(
    organizationId: number,
    boatId: number
  ): Promise<NotificationAudienceMember[]> {
    const users = await User.query()
      .select('users.id', 'users.locale')
      .whereNull('users.anonymized_at')
      .whereHas('ownedBoats', (query) => query.where('boats.id', boatId))
      .whereHas('memberships', (query) =>
        query.where('organization_id', organizationId).where('role', 'boat_owner')
      )
    return users.map((user) => ({ userId: user.id, locale: user.locale }))
  }

  /**
   * Propriétaires de l'organisation dont l'e-mail est celui d'un client CRM
   * (#890) : c'est ainsi qu'une facture adressée à ce client devient « sa »
   * facture dans le portail.
   */
  async ownersByEmail(
    organizationId: number,
    email: string
  ): Promise<NotificationAudienceMember[]> {
    const memberships = await OrganizationMembership.query()
      .where('organizationId', organizationId)
      .where('role', 'boat_owner')
      .whereHas('user', (query) =>
        query.whereRaw('lower(email) = ?', [email.trim().toLowerCase()]).whereNull('anonymized_at')
      )
      .preload('user', (query) => query.select('id', 'locale'))
    return memberships.map((m) => ({ userId: m.userId, locale: m.user.locale }))
  }
}
