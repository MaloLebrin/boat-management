import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import AuditLog from '#models/audit_log'
import Boat from '#models/boat'
import BoatEquipmentAction from '#models/boat_equipment_action'
import Invoice from '#models/invoice'
import Media from '#models/media'
import Organization from '#models/organization'
import OrganizationMembership from '#models/organization_membership'
import User from '#models/user'
import UserSession from '#models/user_session'
import { withTrashed } from '#models/mixins/soft_deletes'
import AccountService from '#services/account_service'
import { DemoAccountProtectedError } from '#exceptions/account_errors'
import { CloudinaryService } from '#services/cloudinary_service'
import EmailQueueService from '#services/email_queue_service'
import OrganizationDeletionService from '#services/organization_deletion_service'
import StripeService from '#services/stripe_service'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEquipmentActionFactory } from '#database/factories/boat_equipment_action_factory'
import { InvoiceFactory } from '#database/factories/invoice_factory'
import { MediaFactory } from '#database/factories/media_factory'
import {
  ACCOUNT_DELETION_GRACE_DAYS,
  ORGANIZATION_DELETION_GRACE_DAYS,
} from '#shared/constants/account_deletion'
import { DEMO_EMAIL } from '#shared/constants/demo'
import type { AccountSettingsProps, PersonalDataExport } from '#shared/types/account'
import { truncateDb } from '#tests/utils/db'
import {
  createAdminUser,
  createMemberUser,
  seedActiveSubscription,
} from '#tests/functional/helpers'

/**
 * Gestion du compte en libre-service (#886) : export de ses données, quitter
 * une organisation, supprimer son compte (rétractation puis anonymisation),
 * supprimer son organisation (grâce, Stripe, purge Cloudinary).
 */

const PASSWORD = 'Password123!'

let emails: Array<{ kind: string; to: string }> = []
let stripeCalls: string[] = []
let cloudinaryDeleted: string[] = []

function swapExternalServices() {
  emails = []
  stripeCalls = []
  cloudinaryDeleted = []
  app.container.swap(
    EmailQueueService,
    () =>
      ({
        sendDeletionScheduled: async (params: { kind: string; to: string }) => {
          emails.push({ kind: params.kind, to: params.to })
        },
        sendNewLogin: async () => {},
      }) as unknown as EmailQueueService
  )
  app.container.swap(
    StripeService,
    () =>
      ({
        isConfigured: () => true,
        setCancelAtPeriodEnd: async (id: string, cancel: boolean) => {
          stripeCalls.push(`cancel_at_period_end:${id}:${cancel}`)
        },
        cancelSubscriptionNow: async (id: string) => {
          stripeCalls.push(`cancel_now:${id}`)
        },
      }) as unknown as StripeService
  )
  app.container.swap(
    CloudinaryService,
    () =>
      ({
        deleteFile: async (publicId: string) => {
          cloudinaryDeleted.push(publicId)
        },
        deleteFolder: async () => {},
      }) as unknown as CloudinaryService
  )
}

function restoreExternalServices() {
  app.container.restore(EmailQueueService)
  app.container.restore(StripeService)
  app.container.restore(CloudinaryService)
}

/** Admin d'une organisation, plus membre d'une seconde (qui a son propre admin). */
async function createMemberOfTwoOrganizations() {
  const owner = await createAdminUser()
  const user = await createMemberUser(owner.organizationId!)
  const otherAdmin = await createAdminUser()
  await OrganizationMembership.create({
    userId: user.id,
    organizationId: otherAdmin.organizationId!,
    role: 'member',
  })
  return { user, firstOrgId: owner.organizationId!, secondOrgId: otherAdmin.organizationId! }
}

test.group('Self-service account — settings & export (functional)', (group) => {
  group.each.setup(async () => {
    const cleanup = await truncateDb()
    swapExternalServices()
    return async () => {
      restoreExternalServices()
      await cleanup()
    }
  })

  test('GET /settings/me exposes memberships and leave blockers', async ({ client, assert }) => {
    const admin = await createAdminUser()
    await createMemberUser(admin.organizationId!)

    const response = await client.get('/settings/me').loginAs(admin).withInertia()

    response.assertStatus(200)
    const account = response.inertiaProps.account as AccountSettingsProps
    assert.lengthOf(account.memberships, 1)
    assert.equal(account.memberships[0].leaveBlockedReason, 'last_admin')
    assert.isTrue(account.memberships[0].isCurrent)
    assert.lengthOf(account.lastAdminOf, 1)
    assert.equal(account.graceDays, ACCOUNT_DELETION_GRACE_DAYS)
  })

  test('GET /settings/me/export downloads the personal data as JSON', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const colleague = await createMemberUser(user.organizationId!)
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    await BoatEquipmentActionFactory.merge({
      boatId: boat.id,
      organizationId: user.organizationId!,
      createdBy: user.id,
    }).create()
    await BoatEquipmentActionFactory.merge({
      boatId: boat.id,
      organizationId: user.organizationId!,
      createdBy: colleague.id,
    }).create()

    const response = await client.get('/settings/me/export').loginAs(user)

    response.assertStatus(200)
    assert.include(response.header('content-disposition'), 'attachment')
    assert.include(response.header('content-type'), 'application/json')
    const data = JSON.parse(response.text()) as PersonalDataExport
    assert.equal(data.format, 'fleetai.personal-data')
    assert.equal(data.profile.email, user.email)
    assert.lengthOf(data.memberships, 1)
    assert.lengthOf(data.authored.equipmentActions, 1, 'only entries the user authored')
    assert.notInclude(response.text(), colleague.email)

    const log = await AuditLog.query().where('action', 'account.export').firstOrFail()
    assert.equal(log.userId, user.id)
  })

  test('the demo account cannot export, leave or delete', async ({ assert }) => {
    const demo = await createAdminUser()
    demo.email = DEMO_EMAIL
    await demo.save()
    const service = await app.container.make(AccountService)

    await assert.rejects(() => service.exportData(demo), DemoAccountProtectedError)
    await assert.rejects(
      () => service.leaveOrganization(demo, demo.organizationId!),
      DemoAccountProtectedError
    )
    await assert.rejects(() => service.requestDeletion(demo), DemoAccountProtectedError)
  })
})

test.group('Self-service account — leave an organization (functional)', (group) => {
  group.each.setup(async () => {
    const cleanup = await truncateDb()
    swapExternalServices()
    return async () => {
      restoreExternalServices()
      await cleanup()
    }
  })

  test('a member leaves an organization and switches to the remaining one', async ({
    client,
    assert,
  }) => {
    const { user, firstOrgId, secondOrgId } = await createMemberOfTwoOrganizations()

    const response = await client
      .delete(`/settings/me/memberships/${firstOrgId}`)
      .loginAs(user)
      .withInertia()
      .redirects(0)

    response.assertStatus(303)
    assert.equal(response.header('location'), '/settings/me')
    const remaining = await OrganizationMembership.query().where('userId', user.id)
    assert.deepEqual(
      remaining.map((m) => m.organizationId),
      [secondOrgId]
    )
    await user.refresh()
    assert.equal(user.organizationId, secondOrgId)
    const log = await AuditLog.query().where('action', 'member.left').firstOrFail()
    assert.equal(log.organizationId, firstOrgId)
  })

  test('the last admin cannot leave', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const otherAdmin = await createAdminUser()
    await OrganizationMembership.create({
      userId: admin.id,
      organizationId: otherAdmin.organizationId!,
      role: 'member',
    })

    await client
      .delete(`/settings/me/memberships/${admin.organizationId}`)
      .loginAs(admin)
      .withInertia()
      .redirects(0)

    assert.lengthOf(await OrganizationMembership.query().where('userId', admin.id), 2)
  })

  test('the only organization of an account cannot be left', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const member = await createMemberUser(admin.organizationId!)

    await client
      .delete(`/settings/me/memberships/${admin.organizationId}`)
      .loginAs(member)
      .withInertia()
      .redirects(0)

    assert.isNotNull(
      await OrganizationMembership.query().where('userId', member.id).first(),
      'membership kept'
    )
  })

  test('leaving an organization one is not a member of changes nothing', async ({
    client,
    assert,
  }) => {
    const { user } = await createMemberOfTwoOrganizations()
    const stranger = await createAdminUser()

    const response = await client
      .delete(`/settings/me/memberships/${stranger.organizationId}`)
      .loginAs(user)
      .withInertia()
      .redirects(0)

    response.assertStatus(303)
    assert.lengthOf(
      await OrganizationMembership.query().where('organizationId', stranger.organizationId!),
      1
    )
  })
})

test.group('Self-service account — delete my account (functional)', (group) => {
  group.each.setup(async () => {
    const cleanup = await truncateDb()
    swapExternalServices()
    return async () => {
      restoreExternalServices()
      await cleanup()
    }
  })

  test('a wrong password leaves the account untouched', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const member = await createMemberUser(admin.organizationId!)

    await client
      .delete('/settings/me')
      .loginAs(member)
      .withInertia()
      .form({ password: 'nope', confirm: 'on' })
      .redirects(0)

    await member.refresh()
    assert.isNull(member.deletionRequestedAt)
    assert.lengthOf(emails, 0)
  })

  test('the confirmation box is required', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const member = await createMemberUser(admin.organizationId!)

    await client
      .delete('/settings/me')
      .loginAs(member)
      .withInertia()
      .form({ password: PASSWORD })
      .redirects(0)

    await member.refresh()
    assert.isNull(member.deletionRequestedAt)
  })

  test('the last admin of an active organization is refused', async ({ client, assert }) => {
    const admin = await createAdminUser()

    await client
      .delete('/settings/me')
      .loginAs(admin)
      .withInertia()
      .form({ password: PASSWORD, confirm: 'on' })
      .redirects(0)

    await admin.refresh()
    assert.isNull(admin.deletionRequestedAt)
  })

  test('requesting deletion cuts every access, signs out and sends the confirmation', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const member = await createMemberUser(admin.organizationId!)
    const other = await UserSession.create({
      id: '00000000-0000-4000-8000-000000000001',
      userId: member.id,
      rememberMeTokenId: null,
      ipAddress: null,
      userAgent: null,
      lastSeenAt: DateTime.now(),
      revokedAt: null,
    })

    const response = await client
      .delete('/settings/me')
      .loginAs(member)
      .withInertia()
      .form({ password: PASSWORD, confirm: 'on' })
      .redirects(0)

    response.assertStatus(303)
    assert.equal(response.header('location'), '/login')
    await member.refresh()
    assert.isNotNull(member.deletionRequestedAt)
    assert.isNotNull(member.sessionsValidAfter)
    await other.refresh()
    assert.isNotNull(other.revokedAt)
    assert.deepEqual(emails, [{ kind: 'account', to: member.email }])
    assert.isNotNull(await AuditLog.findBy('action', 'account.delete_requested'))
  })

  test('an organization already scheduled for deletion does not block', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    await Organization.query()
      .where('id', admin.organizationId!)
      .update({ deletionRequestedAt: DateTime.now().toSQL() })

    await client
      .delete('/settings/me')
      .loginAs(admin)
      .withInertia()
      .form({ password: PASSWORD, confirm: 'on' })
      .redirects(0)

    await admin.refresh()
    assert.isNotNull(admin.deletionRequestedAt)
  })

  test('signing in again during the grace period cancels the deletion', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const member = await createMemberUser(admin.organizationId!)
    member.deletionRequestedAt = DateTime.now().minus({ days: 3 })
    await member.save()

    const response = await client
      .post('/login')
      .form({ email: member.email, password: PASSWORD })
      .redirects(0)

    response.assertStatus(302)
    await member.refresh()
    assert.isNull(member.deletionRequestedAt)
    assert.isNotNull(await AuditLog.findBy('action', 'account.delete_cancelled'))
  })

  test('the purge anonymizes the account once the grace period is over', async ({ assert }) => {
    const admin = await createAdminUser()
    const member = await createMemberUser(admin.organizationId!)
    const formerEmail = member.email
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const action = await BoatEquipmentActionFactory.merge({
      boatId: boat.id,
      organizationId: admin.organizationId!,
      createdBy: member.id,
    }).create()
    member.deletionRequestedAt = DateTime.now().minus({ days: ACCOUNT_DELETION_GRACE_DAYS + 1 })
    await member.save()
    const pending = await createMemberUser(admin.organizationId!)
    pending.deletionRequestedAt = DateTime.now().minus({ days: 2 })
    await pending.save()

    const service = await app.container.make(AccountService)
    assert.equal(await service.purgeExpired(), 1)

    await member.refresh()
    assert.isNotNull(member.anonymizedAt)
    assert.notEqual(member.email, formerEmail)
    assert.isNull(member.fullName)
    assert.isNull(member.organizationId)
    assert.lengthOf(await OrganizationMembership.query().where('userId', member.id), 0)
    assert.isNotNull(await BoatEquipmentAction.find(action.id), 'organization history is kept')
    assert.isNotNull(await AuditLog.findBy('action', 'account.purged'))
    assert.isNull(await User.findBy('email', formerEmail), 'the address is freed')

    await pending.refresh()
    assert.isNull(pending.anonymizedAt, 'still within the grace period')
  })
})

test.group('Self-service account — delete the organization (functional)', (group) => {
  group.each.setup(async () => {
    const cleanup = await truncateDb()
    swapExternalServices()
    return async () => {
      restoreExternalServices()
      await cleanup()
    }
  })

  test('a member cannot delete the organization', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const member = await createMemberUser(admin.organizationId!)
    const org = await Organization.findOrFail(admin.organizationId!)

    const response = await client
      .delete('/settings/org')
      .loginAs(member)
      .form({ password: PASSWORD, organizationName: org.name })
      .redirects(0)

    // Refus Bouncer : redirection avec un message, rien n'est programmé.
    assert.notEqual(response.status(), 200)
    await org.refresh()
    assert.isNull(org.deletionRequestedAt)
  })

  test('the organization name must be typed exactly', async ({ client, assert }) => {
    const admin = await createAdminUser()

    await client
      .delete('/settings/org')
      .loginAs(admin)
      .withInertia()
      .form({ password: PASSWORD, organizationName: 'something else' })
      .redirects(0)

    const org = await Organization.findOrFail(admin.organizationId!)
    assert.isNull(org.deletionRequestedAt)
  })

  test('an admin schedules the deletion, then cancels it', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const member = await createMemberUser(admin.organizationId!)
    const org = await Organization.findOrFail(admin.organizationId!)
    await seedActiveSubscription(org.id)

    await client
      .delete('/settings/org')
      .loginAs(admin)
      .withInertia()
      .form({ password: PASSWORD, organizationName: org.name })
      .redirects(0)

    await org.refresh()
    assert.isNotNull(org.deletionRequestedAt)
    assert.deepEqual(stripeCalls, ['cancel_at_period_end:sub_active_test:true'])
    assert.sameMembers(
      emails.map((e) => e.to),
      [admin.email, member.email]
    )

    const page = await client.get('/settings/org').loginAs(member).withInertia()
    assert.isString(page.inertiaProps.organizationDeletionScheduledFor)

    await client.post('/settings/org/restore').loginAs(admin).withInertia().redirects(0)

    await org.refresh()
    assert.isNull(org.deletionRequestedAt)
    assert.deepEqual(stripeCalls, [
      'cancel_at_period_end:sub_active_test:true',
      'cancel_at_period_end:sub_active_test:false',
    ])
    assert.lengthOf(
      await AuditLog.query().whereIn('action', [
        'organization.delete_requested',
        'organization.delete_cancelled',
      ]),
      2
    )
  })

  test('the purge removes the organization, its files and boats, and releases its members', async ({
    assert,
  }) => {
    const admin = await createAdminUser()
    const org = await Organization.findOrFail(admin.organizationId!)
    await seedActiveSubscription(org.id)
    // Membre d'une autre organisation : basculé, pas anonymisé.
    const elsewhere = await createAdminUser()
    const shared = await createMemberUser(org.id)
    await OrganizationMembership.create({
      userId: shared.id,
      organizationId: elsewhere.organizationId!,
      role: 'member',
    })
    const boat = await BoatFactory.merge({ organizationId: org.id }).create()
    const trashed = await BoatFactory.merge({
      organizationId: org.id,
      deletedAt: DateTime.now(),
    }).create()
    const photo = await MediaFactory.merge({
      organizationId: org.id,
      entityType: 'boat',
      entityId: boat.id,
    }).create()
    const otherBoat = await BoatFactory.merge({
      organizationId: elsewhere.organizationId!,
    }).create()
    // Facture et son avoir : `credited_invoice_id` est en RESTRICT (#877).
    const invoice = await InvoiceFactory.apply('invoice').merge({ organizationId: org.id }).create()
    await InvoiceFactory.apply('invoice')
      .merge({
        organizationId: org.id,
        kind: 'credit_note',
        number: 'AV-000001',
        creditedInvoiceId: invoice.id,
      })
      .create()

    org.deletionRequestedAt = DateTime.now().minus({ days: ORGANIZATION_DELETION_GRACE_DAYS + 1 })
    await org.save()

    const service = await app.container.make(OrganizationDeletionService)
    assert.equal(await service.purgeExpired(), 1)

    assert.isNull(await Organization.find(org.id))
    assert.isNull(await Invoice.find(invoice.id))
    assert.lengthOf(
      await withTrashed(Boat.query().whereIn('id', [boat.id, trashed.id])),
      0,
      'boats in the trash are purged too'
    )
    assert.isNotNull(await Boat.find(otherBoat.id), 'other organizations are untouched')
    assert.isNull(await Media.find(photo.id))
    assert.include(cloudinaryDeleted, photo.cloudinaryPublicId)
    assert.include(stripeCalls, 'cancel_now:sub_active_test')

    await shared.refresh()
    assert.equal(shared.organizationId, elsewhere.organizationId)
    assert.isNull(shared.anonymizedAt)
    await admin.refresh()
    assert.isNotNull(admin.anonymizedAt, 'an account left without organization is anonymized')
  })

  test('an organization within its grace period is not purged', async ({ assert }) => {
    const admin = await createAdminUser()
    await Organization.query()
      .where('id', admin.organizationId!)
      .update({ deletionRequestedAt: DateTime.now().minus({ days: 5 }).toSQL() })

    const service = await app.container.make(OrganizationDeletionService)
    assert.equal(await service.purgeExpired(), 0)
    assert.isNotNull(await Organization.find(admin.organizationId!))
  })
})
