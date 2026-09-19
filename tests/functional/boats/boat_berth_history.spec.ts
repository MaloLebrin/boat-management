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
 * - **#722** — la table sert à la fois aux points de position et aux séjours à
 *   quai. Chacun des deux clôturait « toutes les lignes ouvertes » du bateau
 *   sans distinguer leur nature ; la colonne `kind` sépare désormais les deux,
 *   et le groupe dédié ci-dessous le prouve dans les deux sens ;
 * - **#721** — corrigé sur `main` : la route d'affectation vit sous la garde
 *   `requirePortsPlan`, et une place étrangère y est refusée avec un flash.
 *   C'est pourquoi les tests d'affectation passent par un admin **Entreprise**.
 */

/** Le séjour en cours d'un bateau, ou `null` s'il n'est amarré nulle part. */
async function openStay(boatId: number): Promise<BoatPositionHistory | null> {
  return BoatPositionHistory.query()
    .where('boatId', boatId)
    .where('kind', 'berth')
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

    const open = await BoatPositionHistory.query()
      .where('boatId', boat.id)
      .where('kind', 'berth')
      .whereNull('endedAt')
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

test.group('Amarrage — les deux natures de ligne ne se ferment plus (#722)', (group) => {
  group.each.setup(() => truncateDb())

  /**
   * Les deux sens de la collision corrigée par `kind`. Chacun des deux tests
   * échoue si l'on retire le `.where('kind', …)` de la clôture correspondante
   * — vérifié en le retirant.
   */

  test('un point GPS laisse le séjour à quai ouvert', async ({ client, assert }) => {
    // Admin Entreprise : depuis #721, `PATCH /boats/:id/assignment` est sous la
    // garde de plan marina — un admin Pro y serait refusé avant d'écrire.
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

    const stay = await openStay(boat.id)
    assert.isNotNull(stay, 'le séjour a été clos par l’enregistrement de position')
    assert.equal(stay!.spotId, spot.id)

    // L'historique dit maintenant la même chose que l'écran.
    const moored = await Boat.findOrFail(boat.id)
    assert.equal(moored.spotId, spot.id)
  })

  test('… et réciproquement, amarrer laisse le point de position ouvert', async ({
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
      .where('kind', 'position')
      .whereNull('endedAt')

    assert.lengthOf(positions, 1)
    assert.equal(Number(positions[0].latitude), 43.2965)
  })

  test('chaque nature se clôt elle-même : deux points GPS, un seul ouvert', async ({
    client,
    assert,
  }) => {
    // Le pendant du test précédent : séparer les natures ne doit pas relâcher
    // la clôture *à l'intérieur* d'une nature.
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
    await client
      .post(`/boats/${boat.id}/position`)
      .loginAs(user)
      .form({ latitude: 43.3, longitude: 5.4 })
      .redirects(0)

    const open = await BoatPositionHistory.query().where('boatId', boat.id).whereNull('endedAt')
    assert.lengthOf(open, 2, 'un séjour ouvert + un seul point de position ouvert')

    const kinds = open.map((row) => row.kind).sort()
    assert.deepEqual(kinds, ['berth', 'position'])

    const all = await BoatPositionHistory.query().where('boatId', boat.id)
    assert.lengthOf(all, 3)
  })

  test('la nature est écrite sur chaque ligne', async ({ client, assert }) => {
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

    const rows = await BoatPositionHistory.query().where('boatId', boat.id).orderBy('id')
    assert.lengthOf(rows, 2)
    assert.equal(rows[0].kind, 'berth')
    assert.equal(rows[0].spotId, spot.id)
    assert.equal(rows[1].kind, 'position')
    assert.isNull(rows[1].spotId)
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
