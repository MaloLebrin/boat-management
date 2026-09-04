import Boat from '#models/boat'
import BoatPortStay from '#models/boat_port_stay'
import Port from '#models/port'
import { BoatFactory } from '#database/factories/boat_factory'
import { PortFactory } from '#database/factories/port_factory'
import { createAdminUser } from '#tests/functional/helpers'
import { truncateDb } from '#tests/utils/db'
import { test } from '@japa/runner'

/**
 * Port d'attache relié aux ports de l'organisation (#579).
 *
 * L'invariant du lot est vérifié explicitement : les colonnes `home_port` et
 * `port_name` restent du texte libre — la liste des ports ne fait qu'assister
 * la saisie, elle ne contraint ni ne réécrit rien.
 */
type PortOption = { id: number; name: string }

test.group('Port d’attache — suggestions de ports (#579)', (group) => {
  group.each.setup(() => truncateDb())

  test('GET /boats/new expose les ports de l’organisation', async ({ client, assert }) => {
    const user = await createAdminUser()
    await PortFactory.merge({
      organizationId: user.organizationId!,
      name: 'Port-la-Forêt',
    }).create()
    await PortFactory.merge({ organizationId: user.organizationId!, name: 'Concarneau' }).create()

    const response = await client.get('/boats/new').loginAs(user).withInertia()

    response.assertStatus(200)
    const props = response.inertiaProps as { portOptions: PortOption[] }
    assert.deepEqual(
      props.portOptions.map((p) => p.name),
      ['Concarneau', 'Port-la-Forêt']
    )
  })

  test('GET /boats/:id/edit expose les ports de l’organisation', async ({ client, assert }) => {
    const user = await createAdminUser()
    const port = await PortFactory.merge({
      organizationId: user.organizationId!,
      name: 'Port-la-Forêt',
    }).create()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client.get(`/boats/${boat.id}/edit`).loginAs(user).withInertia()

    response.assertStatus(200)
    const props = response.inertiaProps as { portOptions: PortOption[] }
    assert.deepEqual(props.portOptions, [{ id: port.id, name: 'Port-la-Forêt' }])
  })

  test('une organisation sans port reçoit une liste vide', async ({ client, assert }) => {
    const user = await createAdminUser()

    const response = await client.get('/boats/new').loginAs(user).withInertia()

    const props = response.inertiaProps as { portOptions: PortOption[] }
    assert.deepEqual(props.portOptions, [])
  })

  test('les ports d’une autre organisation ne sont jamais proposés', async ({ client, assert }) => {
    const user = await createAdminUser()
    const other = await createAdminUser()
    await PortFactory.merge({ organizationId: user.organizationId!, name: 'Le Crouesty' }).create()
    await PortFactory.merge({
      organizationId: other.organizationId!,
      name: 'Port-Camargue',
    }).create()

    const response = await client.get('/boats/new').loginAs(user).withInertia()

    const props = response.inertiaProps as { portOptions: PortOption[] }
    assert.deepEqual(
      props.portOptions.map((p) => p.name),
      ['Le Crouesty']
    )
  })

  test('GET /boats/:id/budget expose les ports pour le formulaire d’escale', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const port = await PortFactory.merge({
      organizationId: user.organizationId!,
      name: 'Port-la-Forêt',
    }).create()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client.get(`/boats/${boat.id}/budget`).loginAs(user).withInertia()

    response.assertStatus(200)
    const props = response.inertiaProps as { portOptions: PortOption[] }
    assert.deepEqual(props.portOptions, [{ id: port.id, name: 'Port-la-Forêt' }])
  })

  test('la fiche bateau rapproche le port d’attache d’un port de l’org', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const port = await PortFactory.merge({
      organizationId: user.organizationId!,
      name: 'Port-la-Forêt',
    }).create()
    const boat = await BoatFactory.merge({
      organizationId: user.organizationId!,
      homePort: 'Port-la-Forêt',
    }).create()

    const response = await client.get(`/boats/${boat.id}`).loginAs(user).withInertia()

    response.assertStatus(200)
    const props = response.inertiaProps as { homePortId: number | null }
    assert.equal(props.homePortId, port.id)
  })

  test('un port d’attache hors référentiel ne remonte aucun port', async ({ client, assert }) => {
    const user = await createAdminUser()
    await PortFactory.merge({
      organizationId: user.organizationId!,
      name: 'Port-la-Forêt',
    }).create()
    const boat = await BoatFactory.merge({
      organizationId: user.organizationId!,
      homePort: 'Marina de Bonifacio',
    }).create()

    const response = await client.get(`/boats/${boat.id}`).loginAs(user).withInertia()

    const props = response.inertiaProps as { homePortId: number | null }
    assert.isNull(props.homePortId)
  })

  test('un bateau sans port d’attache ne remonte aucun port', async ({ client, assert }) => {
    const user = await createAdminUser()
    await PortFactory.merge({
      organizationId: user.organizationId!,
      name: 'Port-la-Forêt',
    }).create()
    const boat = await BoatFactory.merge({
      organizationId: user.organizationId!,
      homePort: null,
    }).create()

    const response = await client.get(`/boats/${boat.id}`).loginAs(user).withInertia()

    const props = response.inertiaProps as { homePortId: number | null }
    assert.isNull(props.homePortId)
  })

  test('le port d’un autre org n’est jamais rapproché même à nom identique', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const other = await createAdminUser()
    await PortFactory.merge({
      organizationId: other.organizationId!,
      name: 'Port-la-Forêt',
    }).create()
    const boat = await BoatFactory.merge({
      organizationId: user.organizationId!,
      homePort: 'Port-la-Forêt',
    }).create()

    const response = await client.get(`/boats/${boat.id}`).loginAs(user).withInertia()

    const props = response.inertiaProps as { homePortId: number | null }
    assert.isNull(props.homePortId)
  })

  test('une saisie libre de port d’attache est enregistrée telle quelle', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    await PortFactory.merge({
      organizationId: user.organizationId!,
      name: 'Port-la-Forêt',
    }).create()

    const response = await client
      .post('/boats')
      .loginAs(user)
      .form({ name: 'Sans Souci', propulsionType: 'motorboat', homePort: 'Marina de Bonifacio' })
      .redirects(0)

    response.assertStatus(302)
    const boat = await Boat.query().where('name', 'Sans Souci').firstOrFail()
    assert.equal(boat.homePort, 'Marina de Bonifacio')
    // Aucune FK n'est posée : la table `ports` est strictement inchangée.
    assert.lengthOf(await Port.query().where('organizationId', user.organizationId!), 1)
  })

  test('une escale garde son nom de port en texte libre', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/port-stays`)
      .loginAs(user)
      .form({ portName: 'Mouillage des Glénan', startedAt: '2026-07-01' })
      .redirects(0)

    response.assertStatus(302)
    const stays = await BoatPortStay.query().where('boat_id', boat.id)
    assert.equal(stays[0].portName, 'Mouillage des Glénan')
  })
})
