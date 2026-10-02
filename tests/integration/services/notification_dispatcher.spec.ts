import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import { OrganizationFactory } from '#database/factories/organization_factory'
import { UserFactory } from '#database/factories/user_factory'
import SendPushNotification from '#jobs/send_push_notification'
import Notification from '#models/notification'
import NotificationPreference from '#models/notification_preference'
import OrganizationMembership from '#models/organization_membership'
import type User from '#models/user'
import EmailQueueService from '#services/email_queue_service'
import NotificationDispatcherService from '#services/notification_dispatcher_service'
import NotificationPreferenceService from '#services/notification_preference_service'
import NotificationService from '#services/notification_service'
import type { OrgRole } from '#shared/types/organization'
import type { CreateNotificationParams } from '#shared/types/notification'

/**
 * Préférences de notifications et dispatcher (#888) : chaque canal lit la
 * préférence de la famille (ou le défaut du rôle), les heures calmes coupent
 * le push, l'e-mail part tout de suite ou attend le résumé de 8h.
 */

interface SentEmail {
  kind: 'notification' | 'digest'
  to: string
  title?: string
  count?: number
  unsubscribeUrl?: string | null
}

const originalDispatch = SendPushNotification.dispatch.bind(SendPushNotification)

function captureEmails(): SentEmail[] {
  const sent: SentEmail[] = []
  const fake = {
    async sendNotification(params: { to: string; title: string; unsubscribeUrl: string | null }) {
      sent.push({
        kind: 'notification',
        to: params.to,
        title: params.title,
        unsubscribeUrl: params.unsubscribeUrl,
      })
    },
    async sendNotificationDigest(params: { to: string; entries: unknown[] }) {
      sent.push({ kind: 'digest', to: params.to, count: params.entries.length })
    },
  }
  app.container.swap(EmailQueueService, () => fake as unknown as EmailQueueService)
  return sent
}

function capturePushes(): number[] {
  const pushed: number[] = []
  SendPushNotification.dispatch = (async (payload: { userId: number }) => {
    pushed.push(payload.userId)
  }) as unknown as typeof SendPushNotification.dispatch
  return pushed
}

async function memberOf(role: OrgRole, overrides: Partial<User> = {}) {
  const org = await OrganizationFactory.create()
  const user = await UserFactory.merge({ organizationId: org.id, ...overrides }).create()
  await OrganizationMembership.create({ userId: user.id, organizationId: org.id, role })
  return { org, user }
}

function notificationFor(user: User, overrides: Partial<CreateNotificationParams> = {}) {
  return {
    userId: user.id,
    organizationId: user.organizationId!,
    type: 'reservation.created',
    title: 'Nouvelle réservation sur Ondine',
    body: 'Départ le 3 octobre',
    actionUrl: '/boats/1/reservations',
    ...overrides,
  } satisfies CreateNotificationParams
}

test.group('NotificationService.create — préférences par canal (#888)', (group) => {
  group.each.teardown(() => {
    SendPushNotification.dispatch = originalDispatch
    app.container.restore(EmailQueueService)
  })

  test('applies the role defaults: a mechanic gets nothing from rentals', async ({ assert }) => {
    const pushed = capturePushes()
    const { user } = await memberOf('mechanic')
    const service = new NotificationService()

    const notification = await service.create(notificationFor(user))

    // Écrite (journal de l'anti-doublon) mais ni listée ni poussée.
    assert.isFalse(notification.inApp)
    assert.equal(await service.getUnreadCount(user.id), 0)
    assert.lengthOf(await service.getRecentUnread(user.id), 0)
    assert.deepEqual(pushed, [])
  })

  test('delivers in-app and push to an admin, without e-mail by default', async ({ assert }) => {
    const pushed = capturePushes()
    const emails = captureEmails()
    const { user } = await memberOf('admin')

    await new NotificationService().create(notificationFor(user))

    const service = new NotificationService()
    assert.equal(await service.getUnreadCount(user.id), 1)
    assert.deepEqual(pushed, [user.id])
    assert.lengthOf(emails, 0)
  })

  test('a saved preference overrides the role default, channel by channel', async ({ assert }) => {
    const pushed = capturePushes()
    const emails = captureEmails()
    const { user } = await memberOf('admin')
    await NotificationPreference.create({
      userId: user.id,
      family: 'rental',
      inApp: false,
      push: false,
      email: true,
    })

    const notification = await new NotificationService().create(notificationFor(user))

    assert.isFalse(notification.inApp)
    assert.deepEqual(pushed, [])
    assert.lengthOf(emails, 1)
    assert.equal(emails[0].to, user.email)
    assert.equal(emails[0].title, 'Nouvelle réservation sur Ondine')
    assert.include(emails[0].unsubscribeUrl!, '/notifications/unsubscribe/')
  })

  test('queues the e-mail for the daily digest, except an urgent one', async ({ assert }) => {
    const emails = captureEmails()
    capturePushes()
    const { user } = await memberOf('admin', { notificationEmailDigest: true })
    await NotificationPreference.create({
      userId: user.id,
      family: 'fleet',
      inApp: true,
      push: false,
      email: true,
    })
    const service = new NotificationService()

    const queued = await service.create(notificationFor(user, { type: 'maintenance.overdue' }))
    const urgent = await service.create(
      notificationFor(user, { type: 'incident.created', severity: 'error', title: 'Voie d’eau' })
    )

    await queued.refresh()
    await urgent.refresh()
    assert.isTrue(queued.emailDigestPending)
    assert.isFalse(urgent.emailDigestPending)
    assert.deepEqual(
      emails.map((e) => e.title),
      ['Voie d’eau']
    )
  })
})

test.group('NotificationDispatcherService (#888)', (group) => {
  group.each.teardown(() => {
    SendPushNotification.dispatch = originalDispatch
    app.container.restore(EmailQueueService)
  })

  test('holds the push during quiet hours, in the user time zone', async ({ assert }) => {
    const pushed = capturePushes()
    const { user } = await memberOf('admin', {
      notificationQuietHours: true,
      notificationTimezone: 'America/New_York',
    })
    const notification = await Notification.create({
      userId: user.id,
      organizationId: user.organizationId!,
      type: 'maintenance.overdue',
      severity: 'warning',
      title: 'Vidange',
      inApp: true,
      emailDigestPending: false,
    })
    const dispatcher = new NotificationDispatcherService()
    const recipient = (await dispatcher.recipient(user.id))!

    // 04:00 UTC = minuit à New York : heures calmes.
    const night = DateTime.fromISO('2026-10-02T04:00:00Z')
    assert.isFalse(await dispatcher.push(notification, recipient, night))
    // 14:00 UTC = 10h à New York.
    const day = DateTime.fromISO('2026-10-02T14:00:00Z')
    assert.isTrue(await dispatcher.push(notification, recipient, day))
    assert.deepEqual(pushed, [user.id])
  })

  test('sends one digest at 8am local time and clears the queue', async ({ assert }) => {
    const emails = captureEmails()
    const { user } = await memberOf('admin', { notificationTimezone: 'Europe/Paris' })
    for (const title of ['Vidange en retard', 'Assurance expirée']) {
      await Notification.create({
        userId: user.id,
        organizationId: user.organizationId!,
        type: 'maintenance.overdue',
        severity: 'warning',
        title,
        inApp: true,
        emailDigestPending: true,
      })
    }
    const dispatcher = new NotificationDispatcherService()

    // 07:00 UTC = 9h à Paris (heure d'été) : pas encore.
    await dispatcher.sendDigests(DateTime.fromISO('2026-10-02T07:00:00Z'))
    assert.lengthOf(
      emails.filter((email) => email.to === user.email),
      0
    )

    // 06:00 UTC = 8h à Paris.
    await dispatcher.sendDigests(DateTime.fromISO('2026-10-02T06:00:00Z'))
    // D'autres comptes de la base peuvent avoir leur résumé dans la même passe.
    assert.deepEqual(
      emails.filter((email) => email.to === user.email),
      [{ kind: 'digest', to: user.email, count: 2 }]
    )
    assert.lengthOf(
      await Notification.query().where('userId', user.id).where('emailDigestPending', true),
      0
    )
  })
})

test.group('NotificationPreferenceService (#888)', () => {
  test('one-click unsubscribe turns e-mail off and keeps the other channels', async ({
    assert,
  }) => {
    const { user } = await memberOf('member')
    const service = new NotificationPreferenceService()
    await service.update(user, {
      families: {
        fleet: { inApp: true, push: false, email: true },
        rental: { inApp: true, push: true, email: true },
        billing: { inApp: false, push: false, email: false },
        team: { inApp: true, push: true, email: false },
        ai: { inApp: true, push: true, email: false },
      },
      quietHours: true,
      emailDigest: false,
      timezone: 'Not/AZone',
    })

    await service.unsubscribeEmail(user, 'fleet')

    const matrix = await service.matrixFor(user.id, user.organizationId)
    assert.deepEqual(matrix.fleet, { inApp: true, push: false, email: false })
    assert.deepEqual(matrix.rental, { inApp: true, push: true, email: true })
    await user.refresh()
    assert.isTrue(user.notificationQuietHours)
    // Un fuseau inconnu retombe sur celui de l'app.
    assert.equal(user.notificationTimezone, 'Europe/Paris')
  })

  test('falls back to the member defaults until anything is saved', async ({ assert }) => {
    const { user } = await memberOf('member')
    const matrix = await new NotificationPreferenceService().matrixFor(user.id, user.organizationId)
    assert.deepEqual(matrix.billing, { inApp: false, push: false, email: false })
    assert.deepEqual(matrix.fleet, { inApp: true, push: true, email: false })
  })
})
