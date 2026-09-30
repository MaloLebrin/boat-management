import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { PwaLaunchCounterFactory } from '#database/factories/pwa_launch_counter_factory'
import PwaLaunchCounterService from '#services/pwa_launch_counter_service'
import { PWA_LAUNCH_SESSION_KEY } from '#shared/constants/pwa'
import { createAdminUser } from '#tests/functional/helpers'

test.group('Lancements PWA (#865)', (group) => {
  group.each.setup(() => truncateDb())

  test('?source=pwa incrémente le compteur une fois par session et expose la prop', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const counter = new PwaLaunchCounterService()

    const first = await client.get('/dashboard?source=pwa').loginAs(admin).withInertia()
    first.assertInertiaComponent('dashboard')
    assert.isTrue(first.inertiaProps.launchedFromPwa)
    first.assertSession(PWA_LAUNCH_SESSION_KEY, true)
    assert.equal(await counter.countFor(admin.organizationId!), 1)

    // `loginAs` ouvre une session neuve à chaque requête : on rejoue le drapeau
    // posé par la première pour vérifier qu'un second hit ne compte pas.
    const again = await client
      .get('/dashboard?source=pwa')
      .loginAs(admin)
      .withSession({ [PWA_LAUNCH_SESSION_KEY]: true })
      .withInertia()
    again.assertInertiaComponent('dashboard')
    assert.isTrue(again.inertiaProps.launchedFromPwa)
    assert.equal(await counter.countFor(admin.organizationId!), 1)
  })

  test('un tableau de bord sans la source ne compte pas', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const counter = new PwaLaunchCounterService()

    const page = await client.get('/dashboard').loginAs(admin).withInertia()
    page.assertInertiaComponent('dashboard')
    assert.isFalse(page.inertiaProps.launchedFromPwa)
    assert.equal(await counter.countFor(admin.organizationId!), 0)

    const other = await client.get('/dashboard?source=email').loginAs(admin).withInertia()
    assert.isFalse(other.inertiaProps.launchedFromPwa)
    assert.equal(await counter.countFor(admin.organizationId!), 0)
  })

  test('la factory pose un compteur rattaché à une organisation', async ({ assert }) => {
    const row = await PwaLaunchCounterFactory.with('organization', 1).create()

    assert.equal(row.launches, 1)
    assert.isNumber(row.organizationId)
  })
})
