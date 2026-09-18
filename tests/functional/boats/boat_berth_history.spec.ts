import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import Boat from '#models/boat'
import BoatPositionHistory from '#models/boat_position_history'
import { BoatFactory } from '#database/factories/boat_factory'
import { PontoonFactory } from '#database/factories/pontoon_factory'
import { SpotFactory } from '#database/factories/spot_factory'
import { createEnterpriseAdminUser, createStarterAdminUser } from '#tests/functional/helpers'

/**
 * L'historique des séjours à quai, et les deux constats qu'il révèle (#695).
 *
 * `boats_assign.spec.ts` couvre déjà ce que `PATCH /boats/:id/assignment` fait
 * à `boats.spot_id` : l'éviction de l'occupant, la ré-assignation, le
 * `spotId: null`, le refus d'une place étrangère à la création comme à la mise
 * à jour. Ce qu'aucun test ne regardait, c'est **la trace** que l'opération
 * laisse dans `boat_position_history` — et c'est là que ça se gâte.
 *
 * Un constat suivi par son issue :
 *
 * - **#722** — la table sert à la fois aux points de position et aux séjours à
 *   quai, et chacun des deux clôt « toutes les lignes ouvertes » du bateau,
 *   sans distinguer leur nature.
 *
 * Et la correction de #721 : la route est sous la garde `requirePortsPlan`, et
 * une place étrangère y est refusée avec un flash.
 */

/** Le séjour en cours d'un bateau, ou `null` s'il n'est amarré nulle part. */
async function openStay(boatId: number): Promise<BoatPositionHistory | null> {
  return BoatPositionHistory.query()
    .where('boatId', boatId)
    .whereNull('endedAt')
    .orderBy('id', 'desc')
    .first()
}

async function makeSpot(organizationId: number) {
  const pontoon = await PontoonFactory.with('port', 1, (port) =>
    port.merge({ organizationId })
  ).create()
  return SpotFactory.merge({ organizationId, pontoonId: pontoon.id }).create()
}

test.group('Amarrage — la trace laissée dans l’historique', (group) => {
  group.each.setup(() => truncateDb())

  test('amarrer un bateau ouvre un séjour sur la place', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const spot = await makeSpot(user.organizationId!)

    await client
      .patch(`/boats/${boat.id}/assignment`)
      .loginAs(user)
      .form({ spotId: spot.id })
      .redirects(0)

    const stay = await openStay(boat.id)
    assert.isNotNull(stay)
    assert.equal(stay!.spotId, spot.id)
    assert.isNull(stay!.endedAt)
  })

  test('le déplacer clôt le séjour précédent et en ouvre un seul', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const first = await makeSpot(user.organizationId!)
    const second = await makeSpot(user.organizationId!)

    await client
      .patch(`/boats/${boat.id}/assignment`)
      .loginAs(user)
      .form({ spotId: first.id })
      .redirects(0)
    await client
      .patch(`/boats/${boat.id}/assignment`)
      .loginAs(user)
      .form({ spotId: second.id })
      .redirects(0)

    const open = await BoatPositionHistory.query().where('boatId', boat.id).whereNull('endedAt')
    assert.lengthOf(open, 1, 'un bateau ne peut être à deux endroits à la fois')
    assert.equal(open[0].spotId, second.id)

    const all = await BoatPositionHistory.query().where('boatId', boat.id)
    assert.lengthOf(all, 2)
  })

  test('le démarrer clôt le séjour sans en rouvrir', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const spot = await makeSpot(user.organizationId!)
    const boat = await BoatFactory.merge({
      organizationId: user.organizationId!,
      spotId: spot.id,
    }).create()

    await client
      .patch(`/boats/${boat.id}/assignment`)
      .loginAs(user)
      .form({ spotId: '' })
      .redirects(0)

    assert.isNull(await openStay(boat.id))
    const reloaded = await Boat.findOrFail(boat.id)
    assert.isNull(reloaded.spotId)
  })

  test('le bateau évincé voit son séjour clos, pas seulement son amarrage', async ({
    client,
    assert,
  }) => {
    // L'éviction est déjà testée côté `boats.spot_id` ; sa moitié historique ne
    // l'était pas. Un évincé dont le séjour reste ouvert donnerait deux bateaux
    // « en cours » sur la même place.
    const user = await createEnterpriseAdminUser()
    const spot = await makeSpot(user.organizationId!)
    const occupant = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const newcomer = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    await client
      .patch(`/boats/${occupant.id}/assignment`)
      .loginAs(user)
      .form({ spotId: spot.id })
      .redirects(0)
    await client
      .patch(`/boats/${newcomer.id}/assignment`)
      .loginAs(user)
      .form({ spotId: spot.id })
      .redirects(0)

    assert.isNull(await openStay(occupant.id), "le séjour de l'évincé est resté ouvert")
    const evicted = await Boat.findOrFail(occupant.id)
    assert.isNull(evicted.spotId)

    const arrival = await openStay(newcomer.id)
    assert.isNotNull(arrival)
    assert.equal(arrival!.spotId, spot.id)
  })
})

test.group('⚠️ Amarrage — deux usages d’une même table qui se ferment (#722)', (group) => {
  group.each.setup(() => truncateDb())

  /**
   * **Caractérisation, pas validation.** `BoatPositionService.store` et
   * `BoatHullService._logBerthChange` clôturent tous deux par
   * `whereNull('endedAt')`, sans distinguer un point de position d'un séjour à
   * quai. Les deux se marchent donc dessus.
   */

  test('un point GPS clôt le séjour à quai, alors que le bateau reste amarré', async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const spot = await makeSpot(user.organizationId!)

    await client
      .patch(`/boats/${boat.id}/assignment`)
      .loginAs(user)
      .form({ spotId: spot.id })
      .redirects(0)

    await client
      .post(`/boats/${boat.id}/position`)
      .loginAs(user)
      .form({ latitude: 43.2965, longitude: 5.3698 })
      .redirects(0)

    const stays = await BoatPositionHistory.query()
      .where('boatId', boat.id)
      .whereNotNull('spotId')
      .whereNull('endedAt')

    assert.lengthOf(stays, 0, "le séjour a été clos par l'enregistrement de position")
    // Et pourtant le bateau est toujours à sa place : l'écran dit vrai,
    // l'historique ment.
    const moored = await Boat.findOrFail(boat.id)
    assert.equal(moored.spotId, spot.id)
  })

  test('… et réciproquement, amarrer clôt le point de position ouvert', async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const spot = await makeSpot(user.organizationId!)

    await client
      .post(`/boats/${boat.id}/position`)
      .loginAs(user)
      .form({ latitude: 43.2965, longitude: 5.3698 })
      .redirects(0)

    await client
      .patch(`/boats/${boat.id}/assignment`)
      .loginAs(user)
      .form({ spotId: spot.id })
      .redirects(0)

    const positions = await BoatPositionHistory.query()
      .where('boatId', boat.id)
      .whereNotNull('latitude')
      .whereNull('endedAt')

    assert.lengthOf(positions, 0)
  })
})

test.group('Amarrage — la garde marina et le refus d’une place étrangère (#721)', (group) => {
  group.each.setup(() => truncateDb())

  test('un admin Starter ne peut plus amarrer sur une place héritée', async ({
    client,
    assert,
  }) => {
    // Toute la section `/ports` est fermée à cette organisation — la route
    // d'amarrage l'est désormais aussi : la place héritée d'un abonnement
    // Entreprise passé n'est plus utilisable.
    const user = await createStarterAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const spot = await makeSpot(user.organizationId!)

    const response = await client
      .patch(`/boats/${boat.id}/assignment`)
      .loginAs(user)
      .form({ spotId: spot.id })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/settings/billing')
    response.assertFlashMessage(
      'error',
      'Port mapping (pontoons, moorings, berths) is reserved to the Enterprise plan. Upgrade to Enterprise to map your marina.'
    )

    const untouched = await Boat.findOrFail(boat.id)
    assert.isNull(untouched.spotId)
    assert.isNull(await openStay(boat.id))
  })

  test('une place étrangère est refusée avec un flash', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const outsider = await createEnterpriseAdminUser()
    const own = await makeSpot(user.organizationId!)
    const foreign = await makeSpot(outsider.organizationId!)
    const boat = await BoatFactory.merge({
      organizationId: user.organizationId!,
      spotId: own.id,
    }).create()

    const response = await client
      .patch(`/boats/${boat.id}/assignment`)
      .loginAs(user)
      .form({ spotId: foreign.id })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', 'This spot does not belong to your organisation.')

    const kept = await Boat.findOrFail(boat.id)
    assert.equal(kept.spotId, own.id)
  })
})
