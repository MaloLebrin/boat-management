import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { createAdminUser, createBoatOwnerUser } from '#tests/functional/helpers'

async function makeEligibleEngine(boatId: number) {
  return BoatEngineFactory.merge({ boatId, kind: 'outboard', strokeType: '2_stroke' }).create()
}

test.group('Diagnostic pages (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('GET /diagnostic requires authentication', async ({ client }) => {
    const response = await client.get('/diagnostic').redirects(0)

    response.assertStatus(302)
  })

  test('GET /diagnostic lists only eligible engines of the user org', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const eligible = await makeEligibleEngine(boat.id)
    await BoatEngineFactory.merge({ boatId: boat.id, kind: 'inboard', strokeType: null }).create()
    await BoatEngineFactory.merge({
      boatId: boat.id,
      kind: 'outboard',
      strokeType: '4_stroke',
    }).create()

    const otherUser = await createAdminUser()
    const otherBoat = await BoatFactory.merge({
      organizationId: otherUser.organizationId!,
    }).create()
    await makeEligibleEngine(otherBoat.id)

    const response = await client.get('/diagnostic').loginAs(user).withInertia()

    response.assertStatus(200)
    response.assertInertiaComponent('diagnostic/index')
    const props = response.inertiaProps as { engines: Array<{ id: number }> }
    assert.deepEqual(
      props.engines.map((engine) => engine.id),
      [eligible.id]
    )
  })

  test('GET /diagnostic/first-contact renders the standalone sheet', async ({ client }) => {
    const user = await createAdminUser()

    const response = await client.get('/diagnostic/first-contact').loginAs(user).withInertia()

    response.assertStatus(200)
    response.assertInertiaComponent('diagnostic/first_contact')
  })

  test('GET checklist renders with checked step keys', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await makeEligibleEngine(boat.id)

    await client
      .patch(`/boats/${boat.id}/engines/${engine.id}/diagnostic/steps`)
      .loginAs(user)
      .form({ stepKey: 'global.flywheel', checked: true })
      .redirects(0)

    const response = await client
      .get(`/boats/${boat.id}/engines/${engine.id}/diagnostic`)
      .loginAs(user)
      .withInertia()

    response.assertStatus(200)
    response.assertInertiaComponent('diagnostic/checklist')
    const props = response.inertiaProps as { checkedStepKeys: string[]; canManage: boolean }
    assert.deepEqual(props.checkedStepKeys, ['global.flywheel'])
    assert.isTrue(props.canManage)
  })

  test('GET checklist of another org boat redirects to /boats', async ({ client }) => {
    const user = await createAdminUser()
    const otherUser = await createAdminUser()
    const otherBoat = await BoatFactory.merge({
      organizationId: otherUser.organizationId!,
    }).create()
    const engine = await makeEligibleEngine(otherBoat.id)

    const response = await client
      .get(`/boats/${otherBoat.id}/engines/${engine.id}/diagnostic`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/boats')
  })

  test('GET checklist of an ineligible engine redirects to the engine page', async ({ client }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await BoatEngineFactory.merge({
      boatId: boat.id,
      kind: 'outboard',
      strokeType: '4_stroke',
    }).create()

    const response = await client
      .get(`/boats/${boat.id}/engines/${engine.id}/diagnostic`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', `/boats/${boat.id}/engines/${engine.id}`)
  })

  test('GET sheet renders for a valid slug', async ({ client }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await makeEligibleEngine(boat.id)

    const response = await client
      .get(`/boats/${boat.id}/engines/${engine.id}/diagnostic/sheets/fuel`)
      .loginAs(user)
      .withInertia()

    response.assertStatus(200)
    response.assertInertiaComponent('diagnostic/sheet')
    response.assertInertiaPropsContains({ sheetSlug: 'fuel' })
  })

  test('GET sheet with an unknown slug redirects to the checklist', async ({ client }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await makeEligibleEngine(boat.id)

    const response = await client
      .get(`/boats/${boat.id}/engines/${engine.id}/diagnostic/sheets/zzz`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', `/boats/${boat.id}/engines/${engine.id}/diagnostic`)
  })

  test('GET sheet first-contact in an engine context redirects to the standalone page', async ({
    client,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await makeEligibleEngine(boat.id)

    const response = await client
      .get(`/boats/${boat.id}/engines/${engine.id}/diagnostic/sheets/first-contact`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/diagnostic/first-contact')
  })

  test('GET /diagnostic is refused to a boat_owner (no maintenance.view)', async ({ client }) => {
    const admin = await createAdminUser()
    const owner = await createBoatOwnerUser(admin.organizationId!)

    const response = await client.get('/diagnostic').loginAs(owner).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/dashboard')
  })
})
