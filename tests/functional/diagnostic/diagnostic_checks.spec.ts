import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import BoatEngineDiagnosticCheck from '#models/boat_engine_diagnostic_check'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { createAdminUser, createMechanicUser } from '#tests/functional/helpers'

async function makeEligibleEngine(boatId: number) {
  return BoatEngineFactory.merge({ boatId, kind: 'outboard', strokeType: '2_stroke' }).create()
}

async function checksFor(engineId: number) {
  return BoatEngineDiagnosticCheck.query().where('boatEngineId', engineId)
}

test.group('Diagnostic checks (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('PATCH toggle checked=true creates the check, idempotently', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await makeEligibleEngine(boat.id)

    const url = `/boats/${boat.id}/engines/${engine.id}/diagnostic/steps`
    const first = await client
      .patch(url)
      .loginAs(user)
      .form({ stepKey: 'global.flywheel', checked: true })
      .redirects(0)
    first.assertStatus(302)

    await client
      .patch(url)
      .loginAs(user)
      .form({ stepKey: 'global.flywheel', checked: true })
      .redirects(0)

    const checks = await checksFor(engine.id)
    assert.lengthOf(checks, 1)
    assert.equal(checks[0].stepKey, 'global.flywheel')
  })

  test('PATCH toggle checked=false deletes the check', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await makeEligibleEngine(boat.id)
    await BoatEngineDiagnosticCheck.create({ boatEngineId: engine.id, stepKey: 'global.flywheel' })

    await client
      .patch(`/boats/${boat.id}/engines/${engine.id}/diagnostic/steps`)
      .loginAs(user)
      .form({ stepKey: 'global.flywheel', checked: false })
      .redirects(0)

    assert.lengthOf(await checksFor(engine.id), 0)
  })

  test('PATCH toggle with an unknown stepKey flashes an error and stores nothing', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await makeEligibleEngine(boat.id)

    const response = await client
      .patch(`/boats/${boat.id}/engines/${engine.id}/diagnostic/steps`)
      .loginAs(user)
      .form({ stepKey: 'global.not_a_step', checked: true })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', 'Unknown diagnostic step.')
    assert.lengthOf(await checksFor(engine.id), 0)
  })

  test('PATCH toggle on an ineligible engine flashes an error', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await BoatEngineFactory.merge({
      boatId: boat.id,
      kind: 'inboard',
      strokeType: null,
    }).create()

    const response = await client
      .patch(`/boats/${boat.id}/engines/${engine.id}/diagnostic/steps`)
      .loginAs(user)
      .form({ stepKey: 'global.flywheel', checked: true })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage(
      'error',
      'Troubleshooting checklists only apply to 2-stroke outboard engines.'
    )
    assert.lengthOf(await checksFor(engine.id), 0)
  })

  test('PATCH toggle from another org redirects and stores nothing', async ({ client, assert }) => {
    const user = await createAdminUser()
    const otherUser = await createAdminUser()
    const otherBoat = await BoatFactory.merge({
      organizationId: otherUser.organizationId!,
    }).create()
    const engine = await makeEligibleEngine(otherBoat.id)

    const response = await client
      .patch(`/boats/${otherBoat.id}/engines/${engine.id}/diagnostic/steps`)
      .loginAs(user)
      .form({ stepKey: 'global.flywheel', checked: true })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/boats')
    assert.lengthOf(await checksFor(engine.id), 0)
  })

  test('a mechanic can toggle a step (maintenance.edit)', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const mechanic = await createMechanicUser(admin.organizationId!)
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const engine = await makeEligibleEngine(boat.id)

    await client
      .patch(`/boats/${boat.id}/engines/${engine.id}/diagnostic/steps`)
      .loginAs(mechanic)
      .form({ stepKey: 'compression.all_cylinders', checked: true })
      .redirects(0)

    assert.lengthOf(await checksFor(engine.id), 1)
  })

  test('DELETE reset scope=all clears only the target engine', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await makeEligibleEngine(boat.id)
    const otherEngine = await makeEligibleEngine(boat.id)
    await BoatEngineDiagnosticCheck.create({ boatEngineId: engine.id, stepKey: 'global.flywheel' })
    await BoatEngineDiagnosticCheck.create({ boatEngineId: engine.id, stepKey: 'fuel.fresh_fuel' })
    await BoatEngineDiagnosticCheck.create({
      boatEngineId: otherEngine.id,
      stepKey: 'global.flywheel',
    })

    const response = await client
      .delete(`/boats/${boat.id}/engines/${engine.id}/diagnostic/checks`)
      .loginAs(user)
      .form({ scope: 'all' })
      .redirects(0)

    response.assertStatus(302)
    assert.lengthOf(await checksFor(engine.id), 0)
    assert.lengthOf(await checksFor(otherEngine.id), 1)
  })

  test('DELETE reset scope=fuel only clears fuel steps', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await makeEligibleEngine(boat.id)
    await BoatEngineDiagnosticCheck.create({ boatEngineId: engine.id, stepKey: 'global.flywheel' })
    await BoatEngineDiagnosticCheck.create({ boatEngineId: engine.id, stepKey: 'fuel.fresh_fuel' })

    await client
      .delete(`/boats/${boat.id}/engines/${engine.id}/diagnostic/checks`)
      .loginAs(user)
      .form({ scope: 'fuel' })
      .redirects(0)

    const remaining = await checksFor(engine.id)
    assert.deepEqual(
      remaining.map((check) => check.stepKey),
      ['global.flywheel']
    )
  })

  test('deleting the engine cascades its diagnostic checks', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await makeEligibleEngine(boat.id)
    await BoatEngineDiagnosticCheck.create({ boatEngineId: engine.id, stepKey: 'global.flywheel' })

    await client.delete(`/boats/${boat.id}/engines/${engine.id}`).loginAs(user).redirects(0)

    assert.lengthOf(await checksFor(engine.id), 0)
  })
})
