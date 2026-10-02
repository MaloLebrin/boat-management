import Boat from '#models/boat'
import Media from '#models/media'
import Organization from '#models/organization'
import OrganizationMembership from '#models/organization_membership'
import Subscription from '#models/subscription'
import User from '#models/user'
import { withTrashed } from '#models/mixins/soft_deletes'
import { OrganizationDeletionNotScheduledError } from '#exceptions/account_errors'
import AccountService from '#services/account_service'
import AuditLogService from '#services/audit_log_service'
import BoatHullService from '#services/boat_hull_service'
import { CloudinaryFolders, CloudinaryService } from '#services/cloudinary_service'
import EmailQueueService from '#services/email_queue_service'
import { resourceTypeFromKind } from '#services/media_service'
import StripeService from '#services/stripe_service'
import SubscriptionService from '#services/subscription_service'
import { ORGANIZATION_DELETION_GRACE_DAYS } from '#shared/constants/account_deletion'
import type { OrganizationDeletionProps } from '#shared/types/account'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'

/**
 * Suppression d'une organisation par un admin (#886).
 *
 * La demande pose `organizations.deletion_requested_at` et programme la fin
 * de l'abonnement Stripe à l'échéance (réversible) : l'organisation reste
 * utilisable — et exportable — pendant {@link ORGANIZATION_DELETION_GRACE_DAYS}
 * jours, un bandeau le rappelle à tous ses membres, et un admin peut annuler.
 * Au terme, `PurgeDeletedOrganizations` résilie l'abonnement, efface les
 * fichiers Cloudinary, les bateaux (sans clé étrangère vers l'organisation)
 * puis l'organisation, dont la suppression emporte le reste en `CASCADE`.
 */
@inject()
export default class OrganizationDeletionService {
  constructor(
    private accountService: AccountService,
    private auditLogService: AuditLogService,
    private emailQueue: EmailQueueService,
    private stripeService: StripeService,
    private subscriptionService: SubscriptionService,
    private hull: BoatHullService,
    private cloudinary: CloudinaryService
  ) {}

  purgeDateOf(requestedAt: DateTime): DateTime {
    return requestedAt.plus({ days: ORGANIZATION_DELETION_GRACE_DAYS })
  }

  stateFor(org: Organization): OrganizationDeletionProps {
    return {
      scheduledFor: org.deletionRequestedAt
        ? this.purgeDateOf(org.deletionRequestedAt).toISO()
        : null,
      graceDays: ORGANIZATION_DELETION_GRACE_DAYS,
    }
  }

  async request(user: User, org: Organization): Promise<DateTime> {
    this.accountService.assertNotDemo(user)
    if (org.deletionRequestedAt === null) {
      org.deletionRequestedAt = DateTime.now()
      await org.save()
      await this.#setStripeCancelAtPeriodEnd(org, true)
      await this.auditLogService.log({
        organizationId: org.id,
        userId: user.id,
        action: 'organization.delete_requested',
      })
      await this.#notifyMembers(org)
    }
    return this.purgeDateOf(org.deletionRequestedAt!)
  }

  async cancel(user: User, org: Organization): Promise<void> {
    if (org.deletionRequestedAt === null) throw new OrganizationDeletionNotScheduledError()
    org.deletionRequestedAt = null
    await org.save()
    await this.#setStripeCancelAtPeriodEnd(org, false)
    await this.auditLogService.log({
      organizationId: org.id,
      userId: user.id,
      action: 'organization.delete_cancelled',
    })
  }

  /** Purge quotidienne des organisations au terme de leur période de grâce. */
  async purgeExpired(now: DateTime = DateTime.now()): Promise<number> {
    const cutoff = now.minus({ days: ORGANIZATION_DELETION_GRACE_DAYS })
    const orgs = await Organization.query()
      .whereNotNull('deletionRequestedAt')
      .where('deletionRequestedAt', '<=', cutoff.toSQL()!)

    let purged = 0
    for (const org of orgs) {
      try {
        await this.purge(org)
        purged++
      } catch (error) {
        // Une organisation en échec ne bloque pas les suivantes ; elle sera
        // reprise à la prochaine exécution.
        logger.error({ err: error, organizationId: org.id }, 'Organization purge failed')
      }
    }
    return purged
  }

  async purge(org: Organization): Promise<void> {
    const subscription = await Subscription.query()
      .where('organizationId', org.id)
      .whereNotIn('status', ['canceled', 'incomplete_expired'])
      .first()
    if (subscription?.stripeSubscriptionId && this.stripeService.isConfigured()) {
      await this.stripeService.cancelSubscriptionNow(subscription.stripeSubscriptionId)
    }

    // Fichiers d'abord, ligne par ligne : `deleteFolder` ne vise que les
    // images, un PDF y survivrait.
    const media = await Media.query()
      .select('id', 'cloudinaryPublicId', 'kind', 'format')
      .where('organizationId', org.id)
    for (const item of media) {
      await this.#deleteFile(item.cloudinaryPublicId, resourceTypeFromKind(item.kind, item.format))
    }
    if (org.logoPublicId) await this.#deleteFile(org.logoPublicId, 'image')

    const boats = await withTrashed(Boat.query().where('organizationId', org.id))
    for (const boat of boats) {
      await this.hull.purgePhysically(boat, org)
    }
    try {
      await this.cloudinary.deleteFolder(CloudinaryFolders.organization(org.slug))
    } catch (error) {
      logger.warn({ err: error, organizationId: org.id }, 'Organization folder cleanup failed')
    }

    await this.#releaseMembers(org)
    await org.delete()
    OrganizationMembership.invalidateRoles()
    logger.info({ organizationId: org.id }, 'Organization purged')
  }

  /**
   * Comptes rattachés à l'organisation : basculés sur une autre organisation
   * dont ils sont membres, ou anonymisés s'ils n'en ont pas d'autre — un
   * compte sans organisation n'a plus rien à ouvrir.
   */
  async #releaseMembers(org: Organization): Promise<void> {
    const memberIds = await OrganizationMembership.query()
      .where('organizationId', org.id)
      .select('userId')
    const users = await User.query()
      .whereNull('anonymizedAt')
      .where((query) => {
        query.where('organizationId', org.id).orWhereIn(
          'id',
          memberIds.map((m) => m.userId)
        )
      })

    for (const user of users) {
      const elsewhere = await OrganizationMembership.query()
        .where('userId', user.id)
        .whereNot('organizationId', org.id)
        .orderBy('createdAt', 'asc')
        .orderBy('id', 'asc')
        .first()
      if (elsewhere) {
        if (user.organizationId === org.id) {
          user.organizationId = elsewhere.organizationId
          await user.save()
        }
      } else {
        await this.accountService.anonymize(user)
      }
    }
  }

  async #deleteFile(publicId: string, resourceType: 'image' | 'raw'): Promise<void> {
    try {
      await this.cloudinary.deleteFile(publicId, resourceType)
    } catch (error) {
      logger.warn({ err: error, publicId }, 'Organization purge: Cloudinary delete failed')
    }
  }

  async #setStripeCancelAtPeriodEnd(org: Organization, cancel: boolean): Promise<void> {
    const subscription = await this.subscriptionService.getActive(org.id)
    if (!subscription?.stripeSubscriptionId || !this.stripeService.isConfigured()) return
    try {
      await this.stripeService.setCancelAtPeriodEnd(subscription.stripeSubscriptionId, cancel)
      subscription.cancelAtPeriodEnd = cancel
      await subscription.save()
    } catch (error) {
      // La purge résilie de toute façon l'abonnement : un échec ici ne doit
      // pas empêcher l'admin de programmer (ou d'annuler) la suppression.
      logger.error({ err: error, organizationId: org.id }, 'Stripe cancel_at_period_end failed')
    }
  }

  async #notifyMembers(org: Organization): Promise<void> {
    const members = await OrganizationMembership.query()
      .where('organizationId', org.id)
      .preload('user')
    const purgeAt = this.purgeDateOf(org.deletionRequestedAt!)
    for (const member of members) {
      if (member.user.anonymizedAt !== null) continue
      await this.emailQueue.sendDeletionScheduled({
        kind: 'organization',
        to: member.user.email,
        name: member.user.fullName,
        locale: member.user.locale,
        purgeAt,
        organizationName: org.name,
      })
    }
  }
}
