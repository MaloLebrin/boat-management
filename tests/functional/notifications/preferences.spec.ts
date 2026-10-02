import { test } from '@japa/runner'
import NotificationPreference from '#models/notification_preference'
import User from '#models/user'
import NotificationDispatcherService from '#services/notification_dispatcher_service'
import type { NotificationPreferencesProps } from '#shared/types/notification'
import { createAdminUser, createMechanicUser } from '#tests/functional/helpers'
import env from '#start/env'

/**
 * `/settings/notifications` (#888) : matrice familles × canaux, heures calmes,
 * résumé quotidien, et désinscription en un clic depuis un e-mail.
 */

const MATRIX = {
  fleet: { inApp: true, push: false, email: true },
  rental: { inApp: true, push: true, email: false },
  billing: { inApp: false, push: false, email: false },
  team: { inApp: true, push: true, email: false },
  ai: { inApp: false, push: false, email: false },
}

function unsubscribePath(userId: number) {
  const url = new NotificationDispatcherService().unsubscribeUrl(userId, 'maintenance.overdue')
  return url.replace(env.get('APP_URL'), '')
}

test.group('Notification preferences (#888)', () => {
  test('the page exposes the role defaults until anything is saved', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const mechanic = await createMechanicUser(admin.organizationId!)

    const response = await client.get('/settings/notifications').loginAs(mechanic).withInertia()

    response.assertStatus(200)
    response.assertInertiaComponent('settings/notifications')
    const preferences = response.inertiaProps.preferences as NotificationPreferencesProps
    assert.deepEqual(preferences.families.rental, { inApp: false, push: false, email: false })
    assert.deepEqual(preferences.families.fleet, { inApp: true, push: true, email: false })
    assert.isFalse(preferences.quietHours)
    assert.isFalse(preferences.emailDigest)
    assert.equal(preferences.timezone, 'Europe/Paris')
  })

  test('PUT saves the whole matrix and the cross-channel settings', async ({ client, assert }) => {
    const admin = await createAdminUser()

    const response = await client
      .put('/settings/notifications/preferences')
      .json({
        families: MATRIX,
        quietHours: true,
        emailDigest: true,
        timezone: 'America/Martinique',
      })
      .loginAs(admin)
      .withInertia()
      .redirects(0)

    response.assertStatus(303)
    const rows = await NotificationPreference.query().where('userId', admin.id)
    assert.lengthOf(rows, 5)
    const fleet = rows.find((row) => row.family === 'fleet')!
    assert.isTrue(fleet.email)
    assert.isFalse(fleet.push)
    const user = await User.findOrFail(admin.id)
    assert.isTrue(user.notificationQuietHours)
    assert.isTrue(user.notificationEmailDigest)
    assert.equal(user.notificationTimezone, 'America/Martinique')
  })

  test('PUT rejects an incomplete matrix', async ({ client, assert }) => {
    const admin = await createAdminUser()

    await client
      .put('/settings/notifications/preferences')
      .json({ families: { fleet: MATRIX.fleet }, quietHours: false, emailDigest: false })
      .loginAs(admin)
      .withInertia()
      .redirects(0)

    assert.lengthOf(await NotificationPreference.query().where('userId', admin.id), 0)
  })

  test('the signed unsubscribe link asks first, then turns the family e-mail off', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    await NotificationPreference.create({
      userId: admin.id,
      family: 'fleet',
      inApp: true,
      push: true,
      email: true,
    })
    const path = unsubscribePath(admin.id)

    // Sans session : le lien vient d'une boîte de réception.
    const page = await client.get(path).withInertia()
    page.assertStatus(200)
    page.assertInertiaComponent('notifications/unsubscribe')
    assert.equal(page.inertiaProps.family, 'fleet')
    assert.isFalse(page.inertiaProps.done as boolean)
    const untouched = await NotificationPreference.findByOrFail({
      userId: admin.id,
      family: 'fleet',
    })
    assert.isTrue(untouched.email)

    const confirmed = await client.post(path).withInertia()
    confirmed.assertStatus(200)
    assert.isTrue(confirmed.inertiaProps.done as boolean)
    await untouched.refresh()
    assert.isFalse(untouched.email)
    assert.isTrue(untouched.inApp)
    assert.isTrue(untouched.push)
  })

  test('a tampered unsubscribe link is refused', async ({ client }) => {
    const admin = await createAdminUser()
    const path = unsubscribePath(admin.id)

    const response = await client.post(`${path.slice(0, -4)}XXXX`)
    response.assertStatus(404)
  })
})
