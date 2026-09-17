import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import Notification from '#models/notification'
import OrganizationMembership from '#models/organization_membership'
import StorageThresholdCrossed from '#events/storage_threshold_crossed'
import AiTokenThresholdCrossed from '#events/ai_token_threshold_crossed'
import SendStorageQuotaNotification from '#listeners/send_storage_quota_notification'
import SendAiTokenQuotaNotification from '#listeners/send_ai_token_quota_notification'
import { OrganizationFactory } from '#database/factories/organization_factory'
import { UserFactory } from '#database/factories/user_factory'

/**
 * Listeners de franchissement de quota (#699).
 *
 * ⚠️ Ce que ces tests établissent, et que l'issue #699 supposait acquis :
 * **la déduplication ne couvre que l'e-mail, pas la notification in-app.**
 * Le `correlationSuffix` (`orgId:percent:yyyy-MM`) passé à `EmailQueueService`
 * empêche le second e-mail du mois ; mais le listener appelle ensuite
 * `notificationService.create()` — et non `createIfNotRecent()` comme le fait le
 * scan de flotte. Un seuil franchi, repassé sous la barre, puis refranchi crée
 * donc une seconde notification.
 *
 * Comportement figé tel quel : c'est peut-être voulu (une alerte in-app est moins
 * intrusive qu'un e-mail), mais ça mérite d'être vu plutôt que supposé.
 */

async function orgWithAdmin() {
  const org = await OrganizationFactory.create()
  const admin = await UserFactory.merge({ organizationId: org.id }).create()
  await OrganizationMembership.create({ userId: admin.id, organizationId: org.id, role: 'admin' })
  return { org, admin }
}

test.group('SendStorageQuotaNotification', () => {
  test('crossing the threshold notifies the admin', async ({ assert }) => {
    const { org, admin } = await orgWithAdmin()

    const listener = await app.container.make(SendStorageQuotaNotification)
    await listener.handle(new StorageThresholdCrossed(org, 80))

    const notifications = await Notification.query()
      .where('userId', admin.id)
      .where('type', 'quota.storage')

    assert.lengthOf(notifications, 1)
    assert.equal(notifications[0].severity, 'warning')
  })

  test('a full quota is an error, not a warning', async ({ assert }) => {
    // `percent >= 100 ? 'error' : 'warning'` — la sévérité pilote la couleur et
    // l'urgence perçue. À 100 %, les uploads échouent déjà.
    const { org, admin } = await orgWithAdmin()

    const listener = await app.container.make(SendStorageQuotaNotification)
    await listener.handle(new StorageThresholdCrossed(org, 100))

    const notification = await Notification.query()
      .where('userId', admin.id)
      .where('type', 'quota.storage')
      .firstOrFail()

    assert.equal(notification.severity, 'error')
  })

  test('an organization without an admin is silent and does not throw', async ({ assert }) => {
    const org = await OrganizationFactory.create()

    const listener = await app.container.make(SendStorageQuotaNotification)
    await listener.handle(new StorageThresholdCrossed(org, 90))

    assert.lengthOf(await Notification.query().where('organizationId', org.id), 0)
  })

  test('crossing the same threshold twice DOES duplicate the in-app notification', async ({
    assert,
  }) => {
    // Caractérisation du comportement réel — voir l'en-tête. Seul l'e-mail est
    // dédupliqué, par `correlationSuffix`.
    const { org, admin } = await orgWithAdmin()

    const listener = await app.container.make(SendStorageQuotaNotification)
    await listener.handle(new StorageThresholdCrossed(org, 80))
    await listener.handle(new StorageThresholdCrossed(org, 80))

    assert.lengthOf(
      await Notification.query().where('userId', admin.id).where('type', 'quota.storage'),
      2
    )
  })
})

test.group('SendAiTokenQuotaNotification', () => {
  test('crossing the threshold notifies the admin', async ({ assert }) => {
    const { org, admin } = await orgWithAdmin()

    const listener = await app.container.make(SendAiTokenQuotaNotification)
    await listener.handle(new AiTokenThresholdCrossed(org, 80))

    const notifications = await Notification.query()
      .where('userId', admin.id)
      .where('type', 'quota.ai_tokens')

    assert.lengthOf(notifications, 1)
  })

  test('an organization without an admin is silent and does not throw', async ({ assert }) => {
    const org = await OrganizationFactory.create()

    const listener = await app.container.make(SendAiTokenQuotaNotification)
    await listener.handle(new AiTokenThresholdCrossed(org, 100))

    assert.lengthOf(await Notification.query().where('organizationId', org.id), 0)
  })
})
