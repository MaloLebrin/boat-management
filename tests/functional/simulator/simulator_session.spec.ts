import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import Boat from '#models/boat'
import { BoatFactory } from '#database/factories/boat_factory'
import { UserFactory } from '#database/factories/user_factory'
import { createAdminUser, createStarterPlanUser } from '#tests/functional/helpers'
import { PLAN_LIMITS } from '#shared/types/plan'

/**
 * Tests de caractérisation de `SimulatorController` (vague 0.4) : la
 * passerelle entre le simulateur public et la création d'un bateau.
 */

const SIMULATOR_BOAT = {
  boatType: 'sailboat',
  lengthM: 9.5,
  yearBuilt: 2005,
  navigationCategory: 'B',
  hasDedicatedEngine: 'true',
  hullWear: 'good',
  engineWear: 'good',
  safetyWear: 'new',
  riggingWear: 'worn',
}

test.group('Simulateur — POST /simulator/session (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('mémorise le bateau simulé en session et envoie vers l’inscription', async ({
    client,
    assert,
  }) => {
    const response = await client.post('/simulator/session').form(SIMULATOR_BOAT).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/signup?from=simulator')
    assert.deepEqual(response.session().simulatorBoat, {
      boatType: 'sailboat',
      lengthM: 9.5,
      yearBuilt: 2005,
      navigationCategory: 'B',
      hasDedicatedEngine: true,
      hullWear: 'good',
      engineWear: 'good',
      safetyWear: 'new',
      riggingWear: 'worn',
    })
  })

  test('un bateau invalide (longueur hors plage) n’est pas mémorisé', async ({
    client,
    assert,
  }) => {
    const response = await client
      .post('/simulator/session')
      .form({ ...SIMULATOR_BOAT, lengthM: 50 })
      .redirects(0)

    response.assertStatus(302)
    assert.isUndefined(response.session().simulatorBoat)
  })
})

test.group('Simulateur — POST /boats/from-simulator (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('redirige vers /login sans authentification', async ({ client }) => {
    const response = await client.post('/boats/from-simulator').form(SIMULATOR_BOAT).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('crée le bateau depuis le simulateur et ouvre sa fiche', async ({ client, assert }) => {
    const admin = await createAdminUser()

    const response = await client
      .post('/boats/from-simulator')
      .loginAs(admin)
      .form(SIMULATOR_BOAT)
      .redirects(0)

    const boat = await Boat.query().where('organizationId', admin.organizationId!).firstOrFail()
    response.assertStatus(302)
    response.assertHeader('location', `/boats/${boat.id}`)
    assert.equal(boat.name, 'Mon bateau sailboat 9.5m')
    assert.equal(boat.type, 'sailboat')
    assert.equal(boat.propulsionType, 'sailboat')
    assert.equal(boat.navigationCategory, 'B')
    assert.equal(boat.yearBuilt, 2005)
  })

  test('un semi-rigide devient un bateau à moteur', async ({ client, assert }) => {
    const admin = await createAdminUser()

    await client
      .post('/boats/from-simulator')
      .loginAs(admin)
      .form({ ...SIMULATOR_BOAT, boatType: 'rib', riggingWear: '' })

    const boat = await Boat.query().where('organizationId', admin.organizationId!).firstOrFail()
    assert.equal(boat.type, 'rib')
    assert.equal(boat.propulsionType, 'motorboat')
  })

  test('un utilisateur sans organisation est renvoyé au tableau de bord', async ({
    client,
    assert,
  }) => {
    const orphan = await UserFactory.merge({ organizationId: null }).create()

    const response = await client
      .post('/boats/from-simulator')
      .loginAs(orphan)
      .form(SIMULATOR_BOAT)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/dashboard')
    assert.equal(
      await Boat.query()
        .count('* as total')
        .first()
        .then((r) => Number(r?.$extras.total)),
      0
    )
  })

  test('au plafond de bateaux du plan, le quota bloque avec le flash d’upsell', async ({
    client,
    assert,
  }) => {
    const user = await createStarterPlanUser()
    await BoatFactory.merge({ organizationId: user.organizationId! }).createMany(
      PLAN_LIMITS.starter.maxBoats!
    )

    const response = await client
      .post('/boats/from-simulator')
      .loginAs(user)
      .form(SIMULATOR_BOAT)
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage(
      'error',
      'You have reached the boat limit for your plan. Upgrade to add more boats.'
    )
    const total = await Boat.query()
      .where('organizationId', user.organizationId!)
      .count('* as total')
      .first()
    assert.equal(Number(total?.$extras.total), PLAN_LIMITS.starter.maxBoats)
  })
})
