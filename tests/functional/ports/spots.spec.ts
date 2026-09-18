import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import Spot from '#models/spot'
import { MouillageFactory } from '#database/factories/mouillage_factory'
import { PontoonFactory } from '#database/factories/pontoon_factory'
import { PortFactory } from '#database/factories/port_factory'
import { SpotFactory } from '#database/factories/spot_factory'
import { createEnterpriseAdminUser } from '#tests/functional/helpers'

/**
 * Les quatre routes de place, au niveau HTTP (#695).
 *
 * Elles n'avaient aucune couverture comportementale : un seul test les
 * effleurait, et c'était un test de plan (`PUT /spots/:id` fermé au Starter).
 *
 * Deux d'entre elles — `PUT /spots/:id` et `DELETE /spots/:id` — vivent **hors
 * du préfixe `/ports/:portId`**. Elles n'ont donc aucun port dans l'URL pour se
 * raccrocher : leur isolation multi-tenant repose entièrement sur
 * `SpotService.getForUserOrFail`, et pas — contrairement à ce qu'annonçait
 * l'issue — sur `SpotPolicy`, qu'aucun contrôleur n'instancie (#719).
 *
 * Chaque refus est asserté **avec un témoin** : la redirection seule ne prouve
 * rien, la requête aurait pu écrire puis rediriger.
 */

/** Tout ce que ces quatre routes savent écrire, compté d'un bloc. */
async function spotCount(): Promise<number> {
  const rows = await Spot.all()
  return rows.length
}

test.group('Places — création sous un ponton et sous un mouillage', (group) => {
  group.each.setup(() => truncateDb())

  test('une place créée sous un ponton hérite de son port', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()
    const pontoon = await PontoonFactory.merge({ portId: port.id }).create()

    const response = await client
      .post(`/ports/${port.id}/pontoons/${pontoon.id}/spots`)
      .loginAs(user)
      .form({ name: 'B12', description: 'Bout de ponton' })
      .redirects(0)

    response.assertStatus(302)

    const spots = await Spot.all()
    assert.lengthOf(spots, 1)
    assert.equal(spots[0].name, 'B12')
    assert.equal(spots[0].description, 'Bout de ponton')
    assert.equal(spots[0].pontoonId, pontoon.id)
    // L'invariant `chk_spots_single_owner` : une place pend à un ponton **ou** à
    // un mouillage, jamais aux deux. Le service pose explicitement l'autre à
    // `null` plutôt que de l'omettre.
    assert.isNull(spots[0].mouillageId)
    // L'organisation est **déduite du port**, jamais lue du corps de requête.
    assert.equal(spots[0].organizationId, port.organizationId)
  })

  test('une place créée sous un mouillage suit la même règle, miroir', async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()
    const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()
    const mouillage = await MouillageFactory.merge({ portId: port.id }).create()

    const response = await client
      .post(`/ports/${port.id}/mouillages/${mouillage.id}/spots`)
      .loginAs(user)
      .form({ name: 'CM-04' })
      .redirects(0)

    response.assertStatus(302)

    const spots = await Spot.all()
    assert.lengthOf(spots, 1)
    assert.equal(spots[0].mouillageId, mouillage.id)
    assert.isNull(spots[0].pontoonId)
    assert.equal(spots[0].organizationId, port.organizationId)
  })

  test("l'organisation du payload est ignorée — et c'est le validateur qui la tient", async ({
    client,
    assert,
  }) => {
    // Mesuré : faire lire `payload.organizationId` au service ne change **rien**
    // tant que `createSpotValidator` ne le déclare pas — VineJS ne laisse
    // passer que les clés qu'il connaît. L'invariant est donc tenu par le
    // validateur, pas par le service, et ce test le vérifie de bout en bout
    // plutôt que de faire confiance à l'une des deux couches.
    const user = await createEnterpriseAdminUser()
    const outsider = await createEnterpriseAdminUser()
    const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()
    const pontoon = await PontoonFactory.merge({ portId: port.id }).create()

    await client
      .post(`/ports/${port.id}/pontoons/${pontoon.id}/spots`)
      .loginAs(user)
      .form({ name: 'B12', organizationId: outsider.organizationId, pontoonId: 999999 })
      .redirects(0)

    const spots = await Spot.all()
    assert.lengthOf(spots, 1)
    assert.equal(spots[0].organizationId, user.organizationId)
    assert.equal(spots[0].pontoonId, pontoon.id)
  })

  test('un nom vide ne crée rien', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()
    const pontoon = await PontoonFactory.merge({ portId: port.id }).create()

    const response = await client
      .post(`/ports/${port.id}/pontoons/${pontoon.id}/spots`)
      .loginAs(user)
      .form({ name: '' })
      .redirects(0)

    response.assertStatus(302)
    assert.equal(await spotCount(), 0)
  })
})

test.group('Places — la hiérarchie est vraiment vérifiée', (group) => {
  group.each.setup(() => truncateDb())

  test("un ponton d'un autre port de ma propre organisation est refusé", async ({
    client,
    assert,
  }) => {
    // Le cas que l'appartenance à l'organisation ne suffit pas à couvrir : les
    // deux ports sont à moi, seul le couple (port, ponton) est faux. Sans le
    // `getForPortOrFail`, la place serait créée sous un ponton qui n'appartient
    // pas au port de l'URL — et le plan de marina afficherait une place
    // fantôme.
    const user = await createEnterpriseAdminUser()
    const portA = await PortFactory.merge({ organizationId: user.organizationId! }).create()
    const portB = await PortFactory.merge({ organizationId: user.organizationId! }).create()
    const pontoonB = await PontoonFactory.merge({ portId: portB.id }).create()

    const response = await client
      .post(`/ports/${portA.id}/pontoons/${pontoonB.id}/spots`)
      .loginAs(user)
      .form({ name: 'X1' })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', `/ports/${portA.id}`)
    assert.equal(await spotCount(), 0)
  })

  test("un port d'une autre organisation renvoie à la liste des ports", async ({
    client,
    assert,
  }) => {
    const owner = await createEnterpriseAdminUser()
    const attacker = await createEnterpriseAdminUser()
    const port = await PortFactory.merge({ organizationId: owner.organizationId! }).create()
    const pontoon = await PontoonFactory.merge({ portId: port.id }).create()

    const response = await client
      .post(`/ports/${port.id}/pontoons/${pontoon.id}/spots`)
      .loginAs(attacker)
      .form({ name: 'X1' })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/ports')
    assert.equal(await spotCount(), 0)
  })
})

test.group('Places — les deux routes sans préfixe de port', (group) => {
  group.each.setup(() => truncateDb())

  /**
   * `PUT /spots/:id` et `DELETE /spots/:id` n'ont pas de `:portId` pour se
   * rattraper. Ce groupe est donc le seul endroit qui prouve que leur isolation
   * tient.
   */

  async function seedSpot(organizationId: number) {
    const port = await PortFactory.merge({ organizationId }).create()
    const pontoon = await PontoonFactory.merge({ portId: port.id }).create()
    return SpotFactory.merge({
      organizationId,
      pontoonId: pontoon.id,
      name: 'B12',
      description: 'Bout de ponton',
    }).create()
  }

  test('renommer une place de son organisation fonctionne', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const spot = await seedSpot(user.organizationId!)

    const response = await client
      .put(`/spots/${spot.id}`)
      .loginAs(user)
      .form({ name: 'B13', description: 'Bout de ponton' })
      .redirects(0)

    response.assertStatus(302)

    const updated = await Spot.findOrFail(spot.id)
    assert.equal(updated.name, 'B13')
    assert.equal(updated.description, 'Bout de ponton')
    // Le rattachement ne fait pas partie du payload : renommer ne déplace pas.
    assert.equal(updated.pontoonId, spot.pontoonId)
  })

  test('… mais une mise à jour sans description efface la description existante', async ({
    client,
    assert,
  }) => {
    // Le validateur de mise à jour **est** celui de création
    // (`updateSpotValidator = createSpotValidator`), et le service écrit
    // `payload.description ?? null`. Un PUT partiel n'existe donc pas : ce qui
    // n'est pas renvoyé est effacé. Figé ici parce que c'est le genre de
    // détail qu'un formulaire allégé casserait sans bruit.
    const user = await createEnterpriseAdminUser()
    const spot = await seedSpot(user.organizationId!)

    await client.put(`/spots/${spot.id}`).loginAs(user).form({ name: 'B12' }).redirects(0)

    const updated = await Spot.findOrFail(spot.id)
    assert.isNull(updated.description)
  })

  test("renommer la place d'une autre organisation redirige sans rien changer", async ({
    client,
    assert,
  }) => {
    const owner = await createEnterpriseAdminUser()
    const attacker = await createEnterpriseAdminUser()
    const spot = await seedSpot(owner.organizationId!)

    const response = await client
      .put(`/spots/${spot.id}`)
      .loginAs(attacker)
      .form({ name: 'Pirate' })
      .redirects(0)

    // Ce n'est ni un 403 ni un 404 : `SpotService.getForUserOrFail` ne trouve
    // rien dans l'organisation de l'appelant, lève `SpotNotFoundError`, et le
    // contrôleur renvoie à la liste des ports — sans flash.
    response.assertStatus(302)
    response.assertHeader('location', '/ports')

    const untouched = await Spot.findOrFail(spot.id)
    assert.equal(untouched.name, 'B12')
    assert.equal(untouched.organizationId, owner.organizationId)
  })

  test("supprimer la place d'une autre organisation ne la supprime pas", async ({
    client,
    assert,
  }) => {
    const owner = await createEnterpriseAdminUser()
    const attacker = await createEnterpriseAdminUser()
    const spot = await seedSpot(owner.organizationId!)

    const response = await client.delete(`/spots/${spot.id}`).loginAs(attacker).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/ports')
    assert.isNotNull(await Spot.find(spot.id))
  })

  test('supprimer une place libre de son organisation la supprime', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const spot = await seedSpot(user.organizationId!)

    const response = await client.delete(`/spots/${spot.id}`).loginAs(user).redirects(0)

    response.assertStatus(302)
    assert.isNull(await Spot.find(spot.id))
  })

  test('une place inexistante se comporte comme une place étrangère', async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()

    const response = await client.delete('/spots/999999').loginAs(user).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/ports')
    assert.equal(await spotCount(), 0)
  })
})
