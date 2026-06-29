import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import Notification from '#models/notification'
import { UserFactory } from '#database/factories/user_factory'
import { NotificationFactory } from '#database/factories/notification_factory'

test.group('Notifications — markAllRead datetime consistency', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('PATCH /notifications/read-all marks all unread notifications as read', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.with('organization').create()
    const notifs = await NotificationFactory.merge({
      userId: user.id,
      organizationId: user.organizationId!,
    }).createMany(3)

    const response = await client.patch('/notifications/read-all').loginAs(user).redirects(0)

    response.assertStatus(302)

    for (const notif of notifs) {
      const updated = await Notification.findOrFail(notif.id)
      assert.isNotNull(updated.readAt, `notification ${notif.id} should have readAt set`)
    }
  })

  test('PATCH /notifications/read-all stores readAt as a valid Luxon DateTime (not a raw string)', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.with('organization').create()
    await NotificationFactory.merge({
      userId: user.id,
      organizationId: user.organizationId!,
    }).create()

    const before = DateTime.now()
    await client.patch('/notifications/read-all').loginAs(user).redirects(0)
    const after = DateTime.now()

    const updated = await Notification.query()
      .where('userId', user.id)
      .whereNotNull('readAt')
      .firstOrFail()

    assert.isNotNull(updated.readAt)
    assert.isTrue(
      updated.readAt! >= before && updated.readAt! <= after,
      'readAt should be a DateTime between before and after the request'
    )
  })

  test('PATCH /notifications/read-all does not affect already-read notifications', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.with('organization').create()
    const alreadyReadAt = DateTime.now().minus({ hours: 1 })
    const alreadyRead = await NotificationFactory.merge({
      userId: user.id,
      organizationId: user.organizationId!,
      readAt: alreadyReadAt,
    }).create()

    await client.patch('/notifications/read-all').loginAs(user).redirects(0)

    const refreshed = await Notification.findOrFail(alreadyRead.id)
    assert.isNotNull(refreshed.readAt)
    assert.isTrue(
      refreshed.readAt!.toMillis() === alreadyReadAt.toMillis(),
      'readAt of already-read notifications should not be modified'
    )
  })

  test('PATCH /notifications/:id/read marks a single notification as read', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.with('organization').create()
    const notif = await NotificationFactory.merge({
      userId: user.id,
      organizationId: user.organizationId!,
    }).create()

    const response = await client
      .patch(`/notifications/${notif.id}/read`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)

    const updated = await Notification.findOrFail(notif.id)
    assert.isNotNull(updated.readAt)
    assert.instanceOf(updated.readAt, DateTime)
  })

  test('PATCH /notifications/read-all requires authentication', async ({ client }) => {
    const response = await client.patch('/notifications/read-all').redirects(0)
    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })
})
