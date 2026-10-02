import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { OrganizationFactory } from '#database/factories/organization_factory'
import { UserFactory } from '#database/factories/user_factory'
import SendNotificationDigests from '#jobs/send_notification_digests'
import Notification from '#models/notification'
import NotificationDispatcherService from '#services/notification_dispatcher_service'

/**
 * Résumé quotidien des e-mails — cron horaire (#888). Le job délègue au
 * dispatcher, qui ne sert que les fuseaux où il est 8h : on vérifie ici le
 * branchement, l'heure locale est couverte par `notification_dispatcher.spec`.
 */
test.group('SendNotificationDigests (cron horaire)', (group) => {
  group.each.teardown(() => app.container.restore(NotificationDispatcherService))

  test('runs the digest pass of the dispatcher', async ({ assert }) => {
    const org = await OrganizationFactory.create()
    const user = await UserFactory.merge({ organizationId: org.id }).create()
    await Notification.create({
      userId: user.id,
      organizationId: org.id,
      type: 'maintenance.overdue',
      severity: 'warning',
      title: 'Vidange',
      inApp: true,
      emailDigestPending: true,
    })
    let calls = 0
    class CountingDispatcher extends NotificationDispatcherService {
      async sendDigests() {
        calls++
        return 0
      }
    }
    app.container.swap(NotificationDispatcherService, () => new CountingDispatcher())

    const job = await app.container.make(SendNotificationDigests)
    await job.execute()

    assert.equal(calls, 1)
  })
})
