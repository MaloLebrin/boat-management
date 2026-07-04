import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { BoatFactory } from '#database/factories/boat_factory'
import { UserFactory } from '#database/factories/user_factory'
import OrganizationMembership from '#models/organization_membership'
import PricingSeason from '#models/pricing_season'
import { createAdminUser } from '#tests/functional/helpers'

async function createEnterpriseAdminUser() {
  const user = await UserFactory.with('organization', 1, (org) =>
    org.merge({ plan: 'enterprise' })
  ).create()
  if (user.organizationId) {
    await OrganizationMembership.create({
      userId: user.id,
      organizationId: user.organizationId,
      role: 'admin',
    })
  }
  return user
}

test.group('Pricing seasons (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('creates a global season with a multiplier', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()

    const response = await client.post('/pricing/seasons').loginAs(user).form({
      name: 'Haute saison',
      startsOn: '2026-07-01',
      endsOn: '2026-08-31',
      multiplier: 1.5,
      priority: 10,
    })

    response.assertRedirectsTo('/pricing/seasons')

    const season = await PricingSeason.query()
      .where('organizationId', user.organizationId!)
      .firstOrFail()
    assert.isNull(season.boatId)
    assert.equal(season.name, 'Haute saison')
    assert.equal(Number(season.multiplier), 1.5)
    assert.isNull(season.dailyPrice)
    assert.equal(season.priority, 10)
  })

  test('creates a boat-scoped season with a daily price', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client.post('/pricing/seasons').loginAs(user).form({
      boatId: boat.id,
      name: 'Été bateau',
      startsOn: '2026-07-01',
      endsOn: '2026-07-31',
      dailyPrice: 300,
    })

    response.assertRedirectsTo('/pricing/seasons')

    const season = await PricingSeason.query().where('boatId', boat.id).firstOrFail()
    assert.equal(Number(season.dailyPrice), 300)
    assert.isNull(season.multiplier)
  })

  test('rejects overlapping seasons in the same scope', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()

    await client
      .post('/pricing/seasons')
      .loginAs(user)
      .form({ name: 'A', startsOn: '2026-07-01', endsOn: '2026-07-31', multiplier: 1.2 })

    const response = await client
      .post('/pricing/seasons')
      .loginAs(user)
      .form({ name: 'B', startsOn: '2026-07-15', endsOn: '2026-08-15', multiplier: 1.3 })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage(
      'error',
      'This period overlaps with another period in the same scope.'
    )

    const count = await PricingSeason.query().count('* as total')
    assert.equal(Number(count[0].$extras.total), 1)
  })

  test('allows overlapping seasons across different scopes (global vs boat)', async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    await client
      .post('/pricing/seasons')
      .loginAs(user)
      .form({ name: 'Global', startsOn: '2026-07-01', endsOn: '2026-07-31', multiplier: 1.2 })

    const response = await client.post('/pricing/seasons').loginAs(user).form({
      boatId: boat.id,
      name: 'Boat',
      startsOn: '2026-07-10',
      endsOn: '2026-07-20',
      dailyPrice: 250,
    })

    response.assertRedirectsTo('/pricing/seasons')

    const count = await PricingSeason.query().count('* as total')
    assert.equal(Number(count[0].$extras.total), 2)
  })

  test('allows overlapping seasons on two different boats', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const boatA = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const boatB = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    await client.post('/pricing/seasons').loginAs(user).form({
      boatId: boatA.id,
      name: 'A',
      startsOn: '2026-07-01',
      endsOn: '2026-07-31',
      dailyPrice: 100,
    })

    const response = await client.post('/pricing/seasons').loginAs(user).form({
      boatId: boatB.id,
      name: 'B',
      startsOn: '2026-07-01',
      endsOn: '2026-07-31',
      dailyPrice: 200,
    })

    response.assertRedirectsTo('/pricing/seasons')
    const count = await PricingSeason.query().count('* as total')
    assert.equal(Number(count[0].$extras.total), 2)
  })

  test('rejects a season whose end is before its start', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()

    const response = await client
      .post('/pricing/seasons')
      .loginAs(user)
      .form({ name: 'Bad', startsOn: '2026-08-31', endsOn: '2026-07-01', multiplier: 1.2 })
      .redirects(0)

    response.assertStatus(302)
    const count = await PricingSeason.query().count('* as total')
    assert.equal(Number(count[0].$extras.total), 0)
  })

  test('rejects a season with neither price nor multiplier', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()

    const response = await client
      .post('/pricing/seasons')
      .loginAs(user)
      .form({ name: 'NoPrice', startsOn: '2026-07-01', endsOn: '2026-07-31' })
      .redirects(0)

    response.assertStatus(302)
    const count = await PricingSeason.query().count('* as total')
    assert.equal(Number(count[0].$extras.total), 0)
  })

  test('rejects a season with both price and multiplier', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()

    const response = await client
      .post('/pricing/seasons')
      .loginAs(user)
      .form({
        name: 'Both',
        startsOn: '2026-07-01',
        endsOn: '2026-07-31',
        dailyPrice: 100,
        multiplier: 1.5,
      })
      .redirects(0)

    response.assertStatus(302)
    const count = await PricingSeason.query().count('* as total')
    assert.equal(Number(count[0].$extras.total), 0)
  })

  test('rejects a boat from another organization', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const otherUser = await UserFactory.with('organization', 1, (org) =>
      org.merge({ plan: 'enterprise' })
    ).create()
    const foreignBoat = await BoatFactory.merge({
      organizationId: otherUser.organizationId!,
    }).create()

    const response = await client
      .post('/pricing/seasons')
      .loginAs(user)
      .form({
        boatId: foreignBoat.id,
        name: 'X',
        startsOn: '2026-07-01',
        endsOn: '2026-07-31',
        dailyPrice: 100,
      })
      .redirects(0)

    response.assertStatus(302)
    const count = await PricingSeason.query().count('* as total')
    assert.equal(Number(count[0].$extras.total), 0)
  })

  test('index lists seasons ordered by priority desc', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()

    await client.post('/pricing/seasons').loginAs(user).form({
      name: 'Low',
      startsOn: '2026-01-01',
      endsOn: '2026-02-01',
      multiplier: 1.1,
      priority: 1,
    })
    await client.post('/pricing/seasons').loginAs(user).form({
      name: 'High',
      startsOn: '2026-09-01',
      endsOn: '2026-10-01',
      multiplier: 1.9,
      priority: 9,
    })

    const response = await client.get('/pricing/seasons').loginAs(user).withInertia()
    response.assertStatus(200)
    const props = response.inertiaProps as { seasons: Array<{ name: string; priority: number }> }
    assert.equal(props.seasons[0].name, 'High')
    assert.equal(props.seasons[1].name, 'Low')
  })

  test('updates a season', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()

    await client
      .post('/pricing/seasons')
      .loginAs(user)
      .form({ name: 'Orig', startsOn: '2026-07-01', endsOn: '2026-07-31', multiplier: 1.2 })
    const season = await PricingSeason.query()
      .where('organizationId', user.organizationId!)
      .firstOrFail()

    const response = await client.put(`/pricing/seasons/${season.id}`).loginAs(user).form({
      name: 'Renamed',
      startsOn: '2026-07-01',
      endsOn: '2026-07-31',
      multiplier: 1.4,
    })

    response.assertRedirectsTo('/pricing/seasons')
    await season.refresh()
    assert.equal(season.name, 'Renamed')
    assert.equal(Number(season.multiplier), 1.4)
  })

  test('deletes a season', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    await client
      .post('/pricing/seasons')
      .loginAs(user)
      .form({ name: 'ToDelete', startsOn: '2026-07-01', endsOn: '2026-07-31', multiplier: 1.2 })
    const season = await PricingSeason.query()
      .where('organizationId', user.organizationId!)
      .firstOrFail()

    const response = await client.delete(`/pricing/seasons/${season.id}`).loginAs(user)

    response.assertRedirectsTo('/pricing/seasons')
    assert.isNull(await PricingSeason.find(season.id))
  })

  test('non-enterprise org is blocked with flash', async ({ client, assert }) => {
    const user = await createAdminUser()

    const response = await client.get('/pricing/seasons').loginAs(user).redirects(0)
    response.assertStatus(302)
    response.assertHeader('location', '/')
    response.assertFlashMessage('error', 'This feature requires the Enterprise plan.')

    const store = await client
      .post('/pricing/seasons')
      .loginAs(user)
      .form({ name: 'X', startsOn: '2026-07-01', endsOn: '2026-07-31', multiplier: 1.2 })
      .redirects(0)
    store.assertStatus(302)
    const count = await PricingSeason.query().count('* as total')
    assert.equal(Number(count[0].$extras.total), 0)
  })

  test('cannot update a season from another organization (IDOR)', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const otherUser = await createEnterpriseAdminUser()

    await client
      .post('/pricing/seasons')
      .loginAs(otherUser)
      .form({ name: 'Foreign', startsOn: '2026-07-01', endsOn: '2026-07-31', multiplier: 1.2 })
    const foreignSeason = await PricingSeason.query()
      .where('organizationId', otherUser.organizationId!)
      .firstOrFail()

    const response = await client
      .put(`/pricing/seasons/${foreignSeason.id}`)
      .loginAs(user)
      .form({ name: 'Hacked', startsOn: '2026-07-01', endsOn: '2026-07-31', multiplier: 2 })

    response.assertRedirectsTo('/pricing/seasons')
    await foreignSeason.refresh()
    assert.equal(foreignSeason.name, 'Foreign')
  })

  test('unauthenticated user is redirected to login', async ({ client }) => {
    const response = await client.get('/pricing/seasons')
    response.assertRedirectsTo('/login')
  })
})
