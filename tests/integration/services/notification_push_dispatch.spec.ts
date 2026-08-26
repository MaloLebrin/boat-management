import { test } from '@japa/runner'
import { UserFactory } from '#database/factories/user_factory'
import SendPushNotification from '#jobs/send_push_notification'
import Notification from '#models/notification'
import NotificationService from '#services/notification_service'
import type { SendPushNotificationPayload } from '#shared/types/push'

/**
 * #497 — le dispatch du job push dans `NotificationService.create()` : filtré
 * par les types poussables, et jamais bloquant (même contrat que le broadcast
 * SSE). Le statique `SendPushNotification.dispatch` est substitué le temps du
 * test puis restauré.
 */

const originalDispatch = SendPushNotification.dispatch.bind(SendPushNotification)

test.group('NotificationService.create — dispatch push', (group) => {
  group.each.teardown(() => {
    SendPushNotification.dispatch = originalDispatch
  })

  test('dispatche le job pour un type poussable, avec un payload dénormalisé', async ({
    assert,
  }) => {
    const user = await UserFactory.with('organization').create()
    const dispatched: SendPushNotificationPayload[] = []
    SendPushNotification.dispatch = (async (payload: SendPushNotificationPayload) => {
      dispatched.push(payload)
    }) as typeof SendPushNotification.dispatch

    const service = new NotificationService()
    await service.create({
      userId: user.id,
      organizationId: user.organizationId!,
      type: 'maintenance.overdue',
      title: 'Vidange en retard',
      body: 'Sun Odyssey 35',
      actionUrl: '/planning',
    })

    assert.lengthOf(dispatched, 1)
    assert.deepEqual(dispatched[0], {
      userId: user.id,
      title: 'Vidange en retard',
      body: 'Sun Odyssey 35',
      actionUrl: '/planning',
      type: 'maintenance.overdue',
    })
  })

  test('ne dispatche rien pour un type non poussable', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    let dispatchCount = 0
    SendPushNotification.dispatch = (async () => {
      dispatchCount++
    }) as typeof SendPushNotification.dispatch

    const service = new NotificationService()
    await service.create({
      userId: user.id,
      organizationId: user.organizationId!,
      type: 'member.joined',
      title: 'Nouveau membre',
    })

    assert.equal(dispatchCount, 0)
  })

  test('un échec du dispatch push ne fait pas échouer la création', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    SendPushNotification.dispatch = (async () => {
      throw new Error('queue down')
    }) as typeof SendPushNotification.dispatch

    const service = new NotificationService()
    const notification = await service.create({
      userId: user.id,
      organizationId: user.organizationId!,
      type: 'maintenance.overdue',
      title: 'Vidange en retard',
    })

    assert.isNotNull(await Notification.find(notification.id))
  })
})
