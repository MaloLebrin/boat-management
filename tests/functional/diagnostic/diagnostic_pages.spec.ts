import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { createAdminUser, createBoatOwnerUser } from '#tests/functional/helpers'
import { GLOBAL_CHECKLIST } from '#shared/constants/diagnostic/diagnostic_content'
import { INBOARD_GLOBAL_CHECKLIST } from '#shared/constants/diagnostic/inboard_diesel_sheets'

async function makeEligibleEngine(boatId: number) {
  return BoatEngineFactory.merge({
    boatId,
    kind: 'outboard',
    fuel: 'essence',
    strokeType: '2_stroke',
    family: 'outboard_2t',
  }).create()
}

/** In-bord diesel saildrive — éligible depuis #576, avec ses propres fiches. */
async function makeSaildriveEngine(boatId: number) {
  return BoatEngineFactory.merge({
    boatId,
    kind: 'inboard',
    fuel: 'diesel',
    strokeType: '4_stroke',
    family: 'inboard_diesel_saildrive',
  }).create()
}

/**
 * Hors-bord 4 temps : la seule motorisation courante qu'aucune fiche ne sert.
 * La famille est posée explicitement — le repli sur `kind`/`fuel` de la factory
 * rendrait le cas non déterministe.
 */
async function makeIneligibleEngine(boatId: number) {
  return BoatEngineFactory.merge({
    boatId,
    kind: 'outboard',
    fuel: 'essence',
    strokeType: '4_stroke',
    family: 'outboard_4t',
  }).create()
}

test.group('Diagnostic pages (functional)', (group) => {
  group.each.setup(() => truncateDb())

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
    const saildrive = await makeSaildriveEngine(boat.id)
    await makeIneligibleEngine(boat.id)

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
      props.engines.map((engine) => engine.id).sort(),
      [eligible.id, saildrive.id].sort()
    )
  })

  test('GET /diagnostic sizes the progress on the checklist of each family (#576)', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const outboard = await makeEligibleEngine(boat.id)
    const saildrive = await makeSaildriveEngine(boat.id)

    const response = await client.get('/diagnostic').loginAs(user).withInertia()

    response.assertStatus(200)
    const props = response.inertiaProps as {
      engines: Array<{ id: number; family: string | null; totalSteps: number }>
    }
    const rows = new Map(props.engines.map((engine) => [engine.id, engine]))

    assert.equal(rows.get(outboard.id)!.family, 'outboard_2t')
    assert.equal(rows.get(outboard.id)!.totalSteps, GLOBAL_CHECKLIST.steps.length)
    assert.equal(rows.get(saildrive.id)!.family, 'inboard_diesel_saildrive')
    assert.equal(rows.get(saildrive.id)!.totalSteps, INBOARD_GLOBAL_CHECKLIST.steps.length)
    assert.notEqual(rows.get(outboard.id)!.totalSteps, rows.get(saildrive.id)!.totalSteps)
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
    const engine = await makeIneligibleEngine(boat.id)

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

  test('GET the saildrive sheet renders for an inboard diesel saildrive (#576)', async ({
    client,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await makeSaildriveEngine(boat.id)

    const response = await client
      .get(`/boats/${boat.id}/engines/${engine.id}/diagnostic/sheets/saildrive`)
      .loginAs(user)
      .withInertia()

    response.assertStatus(200)
    response.assertInertiaComponent('diagnostic/sheet')
    response.assertInertiaPropsContains({ sheetSlug: 'saildrive' })
  })

  test('GET a sheet of another family redirects, slug valide ou non (#576)', async ({ client }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const outboard = await makeEligibleEngine(boat.id)
    const saildrive = await makeSaildriveEngine(boat.id)

    // Une fiche in-bord sur un hors-bord 2 temps…
    const onOutboard = await client
      .get(`/boats/${boat.id}/engines/${outboard.id}/diagnostic/sheets/saildrive`)
      .loginAs(user)
      .redirects(0)
    onOutboard.assertStatus(302)
    onOutboard.assertHeader('location', `/boats/${boat.id}/engines/${outboard.id}/diagnostic`)
    onOutboard.assertFlashMessage(
      'error',
      'This diagnostic sheet does not apply to this engine family.'
    )

    // …et « link & sync » (2 temps) sur un diesel, le cas que l'issue vise.
    const onDiesel = await client
      .get(`/boats/${boat.id}/engines/${saildrive.id}/diagnostic/sheets/timing`)
      .loginAs(user)
      .redirects(0)
    onDiesel.assertStatus(302)
    onDiesel.assertHeader('location', `/boats/${boat.id}/engines/${saildrive.id}/diagnostic`)
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
