import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import BoatEngineDiagnosticCheck from '#models/boat_engine_diagnostic_check'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { createAdminUser, createMechanicUser } from '#tests/functional/helpers'

async function makeEligibleEngine(boatId: number) {
  return BoatEngineFactory.merge({
    boatId,
    kind: 'outboard',
    fuel: 'essence',
    strokeType: '2_stroke',
    family: 'outboard_2t',
  }).create()
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

  test('PATCH toggle accepts an inboard checklist key on a diesel (#576)', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await BoatEngineFactory.merge({
      boatId: boat.id,
      kind: 'inboard',
      fuel: 'diesel',
      strokeType: '4_stroke',
      family: 'inboard_diesel_shaft',
    }).create()

    const url = `/boats/${boat.id}/engines/${engine.id}/diagnostic/steps`
    const response = await client
      .patch(url)
      .loginAs(user)
      .form({ stepKey: 'global-inboard.prefilter_bowl', checked: true })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMissing('error')
    const checks = await checksFor(engine.id)
    assert.lengthOf(checks, 1)
    assert.equal(checks[0].stepKey, 'global-inboard.prefilter_bowl')
  })

  test('PATCH reset scoped to a checklist leaves the other family untouched (#576)', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await BoatEngineFactory.merge({
      boatId: boat.id,
      kind: 'inboard',
      fuel: 'diesel',
      strokeType: '4_stroke',
      family: 'inboard_diesel_shaft',
    }).create()

    const url = `/boats/${boat.id}/engines/${engine.id}/diagnostic`
    for (const stepKey of ['global-inboard.prefilter_bowl', 'diesel-fuel.bleed']) {
      await client.patch(`${url}/steps`).loginAs(user).form({ stepKey, checked: true }).redirects(0)
    }

    // Le préfixe `global.` du hors-bord ne doit pas emporter `global-inboard.` :
    // les deux checklists cohabitent sur des espaces de clés distincts.
    await client.delete(`${url}/checks`).loginAs(user).form({ scope: 'global' }).redirects(0)
    assert.lengthOf(await checksFor(engine.id), 2)

    await client
      .delete(`${url}/checks`)
      .loginAs(user)
      .form({ scope: 'global-inboard' })
      .redirects(0)
    const remaining = await checksFor(engine.id)
    assert.lengthOf(remaining, 1)
    assert.equal(remaining[0].stepKey, 'diesel-fuel.bleed')
  })

  test('PATCH toggle on an ineligible engine flashes an error', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    // Hors-bord 4 temps : la seule motorisation courante qu'aucune fiche ne
    // sert depuis #576 — un in-bord diesel est désormais éligible.
    const engine = await BoatEngineFactory.merge({
      boatId: boat.id,
      kind: 'outboard',
      fuel: 'essence',
      strokeType: '4_stroke',
      family: 'outboard_4t',
    }).create()

    const response = await client
      .patch(`/boats/${boat.id}/engines/${engine.id}/diagnostic/steps`)
      .loginAs(user)
      .form({ stepKey: 'global.flywheel', checked: true })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage(
      'error',
      'Troubleshooting checklists are not available for this engine family.'
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
