import AiAssistantConversation from '#models/ai_assistant_conversation'
import AuditLog from '#models/audit_log'
import BoatEquipmentAction from '#models/boat_equipment_action'
import BoatIncident from '#models/boat_incident'
import BoatStatusChange from '#models/boat_status_change'
import Media from '#models/media'
import Notification from '#models/notification'
import Organization from '#models/organization'
import OrganizationMembership from '#models/organization_membership'
import PushSubscription from '#models/push_subscription'
import User from '#models/user'
import UserSession from '#models/user_session'
import OrganizationMemberRemoved from '#events/organization_member_removed'
import {
  DemoAccountProtectedError,
  LastAdminOfActiveOrganizationError,
  MembershipNotFoundError,
  OnlyOrganizationError,
} from '#exceptions/account_errors'
import { LastAdminError } from '#exceptions/organization_errors'
import AuditLogService from '#services/audit_log_service'
import EmailQueueService from '#services/email_queue_service'
import MediaService from '#services/media_service'
import OrganizationMemberService from '#services/organization_member_service'
import PasswordResetService from '#services/password_reset_service'
import {
  ACCOUNT_DELETION_GRACE_DAYS,
  ANONYMIZED_EMAIL_DOMAIN,
} from '#shared/constants/account_deletion'
import { DEMO_EMAIL } from '#shared/constants/demo'
import type {
  AccountMembershipRow,
  AccountSettingsProps,
  LeaveBlockedReason,
  PersonalDataExport,
} from '#shared/types/account'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { randomBytes } from 'node:crypto'

function iso(value: DateTime | null | undefined): string | null {
  return value ? value.toISO() : null
}

/**
 * Gestion du compte en libre-service (#886) : export de ses données, quitter
 * une organisation, supprimer son compte.
 *
 * La suppression passe par une **rétractation** de
 * {@link ACCOUNT_DELETION_GRACE_DAYS} jours : la demande coupe tous les accès
 * (sessions, remember-me, push), une reconnexion l'annule, et le job
 * `PurgeDeletedAccounts` anonymise ensuite le compte.
 *
 * Anonymiser plutôt que supprimer la ligne : les saisies de l'utilisateur
 * (incidents, actions d'équipement, changements de statut…) appartiennent à
 * l'organisation, et `boat_equipment_actions.created_by` est en `CASCADE` —
 * un `DELETE` effacerait l'historique de la flotte.
 */
@inject()
export default class AccountService {
  constructor(
    private auditLogService: AuditLogService,
    private emailQueue: EmailQueueService,
    private memberService: OrganizationMemberService,
    private passwordResetService: PasswordResetService,
    private mediaService: MediaService
  ) {}

  assertNotDemo(user: Pick<User, 'email'>): void {
    if (user.email === DEMO_EMAIL) throw new DemoAccountProtectedError()
  }

  /** Zone « Mes organisations » et « Supprimer mon compte » de `/settings/me`. */
  async settingsFor(user: User): Promise<AccountSettingsProps> {
    const memberships = await this.#membershipsOf(user.id)
    const adminCounts = await this.#otherAdminCounts(
      user.id,
      memberships.filter((m) => m.role === 'admin').map((m) => m.organizationId)
    )

    const rows: AccountMembershipRow[] = memberships.map((membership) => {
      let leaveBlockedReason: LeaveBlockedReason | null = null
      if (membership.role === 'admin' && (adminCounts.get(membership.organizationId) ?? 0) === 0) {
        leaveBlockedReason = 'last_admin'
      } else if (memberships.length === 1) {
        leaveBlockedReason = 'only_organization'
      }
      return {
        organizationId: membership.organizationId,
        name: membership.organization.name,
        role: membership.role,
        isCurrent: membership.organizationId === user.organizationId,
        leaveBlockedReason,
      }
    })

    return {
      memberships: rows,
      lastAdminOf: await this.#lastAdminOfActive(user.id),
      graceDays: ACCOUNT_DELETION_GRACE_DAYS,
    }
  }

  /**
   * Fichier « Exporter mes données » : ce qui est rattaché à la personne
   * (profil, préférences, sessions, notifications, journal d'audit, saisies
   * dont elle est l'auteur). Les données de l'organisation lui appartiennent
   * et passent par les exports flotte.
   */
  async exportData(user: User): Promise<PersonalDataExport> {
    this.assertNotDemo(user)

    const [
      memberships,
      sessions,
      pushSubscriptions,
      notifications,
      auditLogs,
      incidents,
      equipmentActions,
      statusChanges,
      media,
      conversations,
    ] = await Promise.all([
      this.#membershipsOf(user.id),
      UserSession.query()
        .select('ipAddress', 'userAgent', 'createdAt', 'lastSeenAt', 'revokedAt')
        .where('userId', user.id)
        .orderBy('createdAt', 'desc'),
      PushSubscription.query()
        .select('userAgent', 'createdAt', 'lastUsedAt')
        .where('userId', user.id)
        .orderBy('createdAt', 'desc'),
      Notification.query()
        .select('type', 'title', 'body', 'readAt', 'createdAt')
        .where('userId', user.id)
        .orderBy('createdAt', 'desc'),
      AuditLog.query()
        .select('organizationId', 'action', 'entityType', 'entityId', 'metadata', 'createdAt')
        .where('userId', user.id)
        .orderBy('createdAt', 'desc'),
      BoatIncident.query()
        .select('id', 'boatId', 'type', 'occurredAt')
        .where('createdBy', user.id)
        .orderBy('id', 'asc'),
      BoatEquipmentAction.query()
        .select('id', 'boatId', 'label', 'createdAt')
        .where('createdBy', user.id)
        .orderBy('id', 'asc'),
      BoatStatusChange.query()
        .select('boatId', 'fromStatus', 'toStatus', 'createdAt')
        .where('userId', user.id)
        .orderBy('id', 'asc'),
      Media.query()
        .select('entityType', 'originalFilename', 'createdAt')
        .where('uploadedById', user.id)
        .orderBy('id', 'asc'),
      AiAssistantConversation.query()
        .select('createdAt', 'messages')
        .where('userId', user.id)
        .orderBy('createdAt', 'desc'),
    ])

    if (user.organizationId) {
      await this.auditLogService.log({
        organizationId: user.organizationId,
        userId: user.id,
        action: 'account.export',
      })
    }

    return {
      format: 'fleetai.personal-data',
      version: 1,
      exportedAt: DateTime.now().toISO()!,
      profile: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        locale: user.locale,
        theme: user.theme,
        emailVerifiedAt: iso(user.emailVerifiedAt),
        twoFactorEnabled: user.hasTwoFactorEnabled,
        notifyNewLogin: user.notifyNewLogin,
        lastLoginAt: iso(user.lastLoginAt),
        createdAt: user.createdAt.toISO()!,
      },
      memberships: memberships.map((m) => ({
        organizationId: m.organizationId,
        organization: m.organization.name,
        role: m.role,
        since: m.createdAt.toISO()!,
      })),
      sessions: sessions.map((s) => ({
        ipAddress: s.ipAddress,
        userAgent: s.userAgent,
        createdAt: s.createdAt.toISO()!,
        lastSeenAt: iso(s.lastSeenAt),
        revokedAt: iso(s.revokedAt),
      })),
      pushSubscriptions: pushSubscriptions.map((p) => ({
        userAgent: p.userAgent,
        createdAt: p.createdAt.toISO()!,
        lastUsedAt: iso(p.lastUsedAt),
      })),
      notifications: notifications.map((n) => ({
        type: n.type,
        title: n.title,
        body: n.body,
        readAt: iso(n.readAt),
        createdAt: n.createdAt.toISO()!,
      })),
      auditLog: auditLogs.map((log) => ({
        organizationId: log.organizationId,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        metadata: log.metadata,
        createdAt: log.createdAt.toISO()!,
      })),
      authored: {
        incidents: incidents.map((i) => ({
          id: i.id,
          boatId: i.boatId,
          type: i.type,
          occurredAt: iso(i.occurredAt),
        })),
        equipmentActions: equipmentActions.map((a) => ({
          id: a.id,
          boatId: a.boatId,
          label: a.label,
          createdAt: a.createdAt.toISO()!,
        })),
        statusChanges: statusChanges.map((c) => ({
          boatId: c.boatId,
          fromStatus: c.fromStatus,
          toStatus: c.toStatus,
          createdAt: c.createdAt.toISO()!,
        })),
        media: media.map((m) => ({
          entityType: m.entityType,
          originalFilename: m.originalFilename,
          createdAt: m.createdAt.toISO()!,
        })),
      },
      assistantConversations: conversations.map((c) => ({
        createdAt: c.createdAt.toISO()!,
        messages: c.messages,
      })),
    }
  }

  /**
   * Quitte une organisation. Refusé au dernier admin (il doit en nommer un
   * autre ou supprimer l'organisation) et sur la seule organisation du compte
   * (supprimer le compte, plutôt). Les saisies gardent leur auteur ; les
   * tâches ouvertes qui lui étaient confiées redeviennent non assignées.
   */
  async leaveOrganization(user: User, organizationId: number): Promise<void> {
    this.assertNotDemo(user)

    const memberships = await OrganizationMembership.query()
      .where('userId', user.id)
      .orderBy('createdAt', 'asc')
      .orderBy('id', 'asc')
    const membership = memberships.find((m) => m.organizationId === organizationId)
    if (!membership) throw new MembershipNotFoundError()

    if (membership.role === 'admin') {
      const counts = await this.#otherAdminCounts(user.id, [organizationId])
      if ((counts.get(organizationId) ?? 0) === 0) throw new LastAdminError()
    }
    const next = memberships.find((m) => m.organizationId !== organizationId)
    if (!next) throw new OnlyOrganizationError()

    await db.transaction(async (trx) => {
      membership.useTransaction(trx)
      await membership.delete()
      if (user.organizationId === organizationId) {
        user.useTransaction(trx)
        user.organizationId = next.organizationId
        await user.save()
      }
    })
    await this.memberService.releaseOpenTasks(organizationId, user.id)

    await this.auditLogService.log({
      organizationId,
      userId: user.id,
      action: 'member.left',
      entityType: 'user',
      entityId: user.id,
    })
    const organization = await Organization.findOrFail(organizationId)
    await OrganizationMemberRemoved.dispatch(organization, user.id, user.fullName ?? user.email)
  }

  /**
   * Demande de suppression du compte : tous les accès sont coupés, un e-mail
   * confirme la date de purge. Refusée au dernier admin d'une organisation
   * active (une organisation déjà en cours de suppression ne bloque pas).
   */
  async requestDeletion(user: User): Promise<DateTime> {
    this.assertNotDemo(user)

    const lastAdminOf = await this.#lastAdminOfActive(user.id)
    if (lastAdminOf.length > 0) throw new LastAdminOfActiveOrganizationError(lastAdminOf)

    user.deletionRequestedAt = DateTime.now()
    await user.save()
    await this.passwordResetService.revokeAllAccess(user)
    await PushSubscription.query().where('userId', user.id).delete()

    if (user.organizationId) {
      await this.auditLogService.log({
        organizationId: user.organizationId,
        userId: user.id,
        action: 'account.delete_requested',
      })
    }

    const purgeAt = this.purgeDateOf(user.deletionRequestedAt)
    await this.emailQueue.sendDeletionScheduled({
      kind: 'account',
      to: user.email,
      name: user.fullName,
      locale: user.locale,
      purgeAt,
    })
    return purgeAt
  }

  purgeDateOf(requestedAt: DateTime): DateTime {
    return requestedAt.plus({ days: ACCOUNT_DELETION_GRACE_DAYS })
  }

  /**
   * Rétractation : appelée à la connexion d'un compte dont la suppression est
   * en attente. Rend `true` si une demande a été annulée.
   */
  async cancelDeletion(user: User): Promise<boolean> {
    if (user.deletionRequestedAt === null || user.anonymizedAt !== null) return false
    user.deletionRequestedAt = null
    await user.save()
    if (user.organizationId) {
      await this.auditLogService.log({
        organizationId: user.organizationId,
        userId: user.id,
        action: 'account.delete_cancelled',
      })
    }
    return true
  }

  /** Purge quotidienne (job `PurgeDeletedAccounts`) des comptes au terme de la rétractation. */
  async purgeExpired(now: DateTime = DateTime.now()): Promise<number> {
    const cutoff = now.minus({ days: ACCOUNT_DELETION_GRACE_DAYS })
    const users = await User.query()
      .whereNotNull('deletionRequestedAt')
      .whereNull('anonymizedAt')
      .where('deletionRequestedAt', '<=', cutoff.toSQL()!)

    let purged = 0
    for (const user of users) {
      // Devenu entre-temps dernier admin d'une organisation active (un autre
      // admin est parti) : la purge orphelinerait l'organisation.
      const lastAdminOf = await this.#lastAdminOfActive(user.id)
      if (lastAdminOf.length > 0) {
        logger.warn({ userId: user.id }, 'PurgeDeletedAccounts: last admin, purge postponed')
        continue
      }
      await this.anonymize(user)
      purged++
    }
    return purged
  }

  /**
   * Purge définitive : la ligne `users` reste (voir la classe), vidée de
   * toute donnée personnelle ; adhésions, sessions, notifications, push,
   * codes 2FA et avatar disparaissent. Le journal d'audit garde ses lignes,
   * rattachées à un compte qui ne dit plus qui il était.
   */
  async anonymize(user: User): Promise<void> {
    const formerEmail = user.email
    const memberships = await OrganizationMembership.query().where('userId', user.id)

    for (const membership of memberships) {
      await this.memberService.releaseOpenTasks(membership.organizationId, user.id)
      await this.auditLogService.log({
        organizationId: membership.organizationId,
        userId: user.id,
        action: 'account.purged',
        entityType: 'user',
        entityId: user.id,
      })
    }

    const avatars = await Media.query()
      .select('id')
      .where('entityType', 'user')
      .where('entityId', user.id)
    for (const avatar of avatars) {
      await this.mediaService.deleteForEntity(avatar.id, 'user', user.id, null)
    }

    await db.transaction(async (trx) => {
      await trx.from('organization_memberships').where('user_id', user.id).delete()
      await trx.from('notifications').where('user_id', user.id).delete()
      await trx.from('push_subscriptions').where('user_id', user.id).delete()
      await trx.from('user_sessions').where('user_id', user.id).delete()
      await trx.from('remember_me_tokens').where('tokenable_id', user.id).delete()
      await trx.from('two_factor_recovery_codes').where('user_id', user.id).delete()
      await trx.from('pending_imports').where('user_id', user.id).delete()
      await trx.from('boat_owners').where('user_id', user.id).delete()
      await trx.from('password_reset_tokens').where('email', formerEmail).delete()
      await trx.from('email_verification_tokens').where('email', formerEmail).delete()

      const anonymizedEmail = `deleted-user-${user.id}@${ANONYMIZED_EMAIL_DOMAIN}`
      // Les invitations acceptées sont gardées comme trace du rattachement :
      // elles ne doivent plus porter l'adresse.
      await trx
        .from('organization_invitations')
        .whereRaw('lower(email) = ?', [formerEmail.toLowerCase()])
        .update({ email: anonymizedEmail })

      user.useTransaction(trx)
      user.merge({
        email: anonymizedEmail,
        fullName: null,
        // Mot de passe inutilisable : haché par le modèle, jamais communiqué.
        password: randomBytes(32).toString('hex'),
        locale: null,
        theme: null,
        organizationId: null,
        emailVerifiedAt: null,
        lastLoginAt: null,
        notifyNewLogin: false,
        dashboardLayout: null,
        twoFactorSecret: null,
        twoFactorConfirmedAt: null,
        twoFactorLastUsedStep: null,
        sessionsValidAfter: DateTime.now(),
        anonymizedAt: DateTime.now(),
      })
      await user.save()
    })
    OrganizationMembership.invalidateRoles()
  }

  async #membershipsOf(userId: number) {
    return OrganizationMembership.query()
      .where('userId', userId)
      .preload('organization', (query) => query.select('id', 'name', 'deletionRequestedAt'))
      .orderBy('createdAt', 'asc')
      .orderBy('id', 'asc')
  }

  /** Nombre d'admins **autres** que `userId`, par organisation. */
  async #otherAdminCounts(userId: number, organizationIds: number[]): Promise<Map<number, number>> {
    const counts = new Map<number, number>()
    if (organizationIds.length === 0) return counts
    const rows: { organization_id: number; total: string | number }[] = await db
      .from('organization_memberships')
      .select('organization_id')
      .count('* as total')
      .whereIn('organization_id', organizationIds)
      .where('role', 'admin')
      .whereNot('user_id', userId)
      .groupBy('organization_id')
    for (const row of rows) counts.set(Number(row.organization_id), Number(row.total))
    return counts
  }

  /** Organisations actives (non programmées pour suppression) dont `userId` est le seul admin. */
  async #lastAdminOfActive(userId: number): Promise<string[]> {
    const adminships = await OrganizationMembership.query()
      .where('userId', userId)
      .where('role', 'admin')
      .preload('organization', (query) => query.select('id', 'name', 'deletionRequestedAt'))
    const active = adminships.filter((m) => m.organization.deletionRequestedAt === null)
    const counts = await this.#otherAdminCounts(
      userId,
      active.map((m) => m.organizationId)
    )
    return active
      .filter((m) => (counts.get(m.organizationId) ?? 0) === 0)
      .map((m) => m.organization.name)
  }
}
