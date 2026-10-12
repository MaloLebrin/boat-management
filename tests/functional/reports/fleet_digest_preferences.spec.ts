import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import User from '#models/user'
import NotificationPreferenceService from '#services/notification_preference_service'
import type { NotificationPreferencesProps } from '#shared/types/notification'
import {
  createAdminUser,
  createBoatOwnerUser,
  createMemberUser,
  createStarterAdminUser,
} from '#tests/functional/helpers'

/**
 * Rapports de flotte par e-mail (#871) : préférences dans
 * `/settings/notifications` et désinscription en un clic depuis l'e-mail.
 */

const MATRIX = {
  fleet: { inApp: true, push: true, email: false },
  rental: { inApp: true, push: true, email: false },
  billing: { inApp: true, push: true, email: false },
  team: { inApp: true, push: true, email: false },
  ai: { inApp: true, push: true, email: false },
}

async function unsubscribePath(userId: number, kind: 'weekly' | 'monthly') {
  const preferences = await app.container.make(NotificationPreferenceService)
  return `/reports/digest/unsubscribe/${preferences.fleetDigestUnsubscribeToken(userId, kind)}`
}

test.group('Fleet digest preferences (#871)', () => {
  test('an admin on Pro gets both reports by default', async ({ client, assert }) => {
    const admin = await createAdminUser('pro')

    const response = await client.get('/settings/notifications').loginAs(admin).withInertia()

    response.assertStatus(200)
    const preferences = response.inertiaProps.preferences as NotificationPreferencesProps
    assert.deepEqual(preferences.fleetDigests, {
      weekly: true,
      monthly: true,
      weeklyAvailable: true,
      monthlyAvailable: true,
    })
  })

  test('the monthly report is not offered on Starter, nor to a member', async ({
    client,
    assert,
  }) => {
    const starterAdmin = await createStarterAdminUser()
    const starter = await client.get('/settings/notifications').loginAs(starterAdmin).withInertia()
    const starterPrefs = starter.inertiaProps.preferences as NotificationPreferencesProps
    assert.isFalse(starterPrefs.fleetDigests.monthlyAvailable)
    assert.isTrue(starterPrefs.fleetDigests.weeklyAvailable)

    const admin = await createAdminUser('pro')
    const memberUser = await createMemberUser(admin.organizationId!)
    const memberPage = await client.get('/settings/notifications').loginAs(memberUser).withInertia()
    const memberPrefs = memberPage.inertiaProps.preferences as NotificationPreferencesProps
    assert.deepEqual(memberPrefs.fleetDigests, {
      weekly: false,
      monthly: false,
      weeklyAvailable: true,
      monthlyAvailable: false,
    })

    const owner = await createBoatOwnerUser(admin.organizationId!)
    const ownerPage = await client.get('/settings/notifications').loginAs(owner).withInertia()
    const ownerPrefs = ownerPage.inertiaProps.preferences as NotificationPreferencesProps
    assert.isFalse(ownerPrefs.fleetDigests.weeklyAvailable)
  })

  test('PUT saves the report choices, and leaves an absent one untouched', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser('pro')

    const response = await client
      .put('/settings/notifications/preferences')
      .json({
        families: MATRIX,
        quietHours: false,
        emailDigest: false,
        timezone: 'Europe/Paris',
        weeklyDigest: false,
        monthlyReport: true,
      })
      .loginAs(admin)
      .withInertia()
      .redirects(0)

    response.assertStatus(303)
    const saved = await User.findOrFail(admin.id)
    assert.isFalse(saved.weeklyDigestEmail)
    assert.isTrue(saved.monthlyReportEmail)

    await client
      .put('/settings/notifications/preferences')
      .json({ families: MATRIX, quietHours: false, emailDigest: false, timezone: 'Europe/Paris' })
      .loginAs(admin)
      .withInertia()
      .redirects(0)
    await saved.refresh()
    assert.isFalse(saved.weeklyDigestEmail)
    assert.isTrue(saved.monthlyReportEmail)
  })

  test('the signed link asks first, then stops that report only', async ({ client, assert }) => {
    const admin = await createAdminUser('pro')
    const path = await unsubscribePath(admin.id, 'weekly')

    // Sans session : le lien vient d'une boîte de réception.
    const page = await client.get(path).withInertia()
    page.assertStatus(200)
    page.assertInertiaComponent('reports/digest_unsubscribe')
    assert.equal(page.inertiaProps.kind, 'weekly')
    assert.isFalse(page.inertiaProps.done as boolean)
    const untouched = await User.findOrFail(admin.id)
    assert.isNull(untouched.weeklyDigestEmail)

    const confirmed = await client.post(path).withInertia()
    confirmed.assertStatus(200)
    assert.isTrue(confirmed.inertiaProps.done as boolean)
    await untouched.refresh()
    assert.isFalse(untouched.weeklyDigestEmail)
    assert.isNull(untouched.monthlyReportEmail)
  })

  test('a tampered link, or a notification-family link, is refused', async ({ client }) => {
    const admin = await createAdminUser('pro')
    const path = await unsubscribePath(admin.id, 'monthly')
    const tampered = await client.post(`${path.slice(0, -4)}XXXX`)
    tampered.assertStatus(404)

    const preferences = await app.container.make(NotificationPreferenceService)
    const familyToken = preferences.unsubscribeToken(admin.id, 'fleet')
    const crossed = await client.get(`/reports/digest/unsubscribe/${familyToken}`)
    crossed.assertStatus(404)
  })
})
