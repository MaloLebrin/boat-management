import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Port from '#models/port'
import { PortFactory } from '#database/factories/port_factory'
import { createAdminUser } from '#tests/functional/helpers'

/**
 * Pays du port en liste fermée ISO 3166-1 alpha-2 (#580).
 *
 * Le désaccord était ici en sens inverse de celui du pavillon : l'UI bloquait
 * la saisie à 2 caractères alors que le serveur en acceptait 8.
 */
test.group('Port country (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('POST enregistre un code pays de la liste', async ({ client, assert }) => {
    const user = await createAdminUser()

    await client.post('/ports').loginAs(user).form({ name: 'Port Vieux', country: 'FR' })

    const port = await Port.findBy('name', 'Port Vieux')
    assert.isNotNull(port)
    assert.equal(port!.country, 'FR')
  })

  test('POST refuse une valeur hors liste', async ({ client, assert }) => {
    const user = await createAdminUser()

    await client.post('/ports').loginAs(user).form({ name: 'Port Refusé', country: 'France' })

    assert.isNull(await Port.findBy('name', 'Port Refusé'))
  })

  test('POST laisse le pays vide quand le select ne l’est pas renseigné', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()

    await client.post('/ports').loginAs(user).form({ name: 'Port Sans Pays', country: '' })

    const port = await Port.findBy('name', 'Port Sans Pays')
    assert.isNotNull(port)
    assert.isNull(port!.country)
  })

  /** Même garantie que côté bateau : aucun port existant n'est bloqué en édition. */
  test('un port portant un ancien pays libre reste éditable', async ({ client, assert }) => {
    const user = await createAdminUser()
    const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()

    await Port.query().where('id', port.id).update({ country: 'Bretagne' })

    const response = await client
      .put(`/ports/${port.id}`)
      .loginAs(user)
      .form({ name: 'Renommé depuis un pays legacy' })
      .redirects(0)

    response.assertStatus(302)
    await port.refresh()
    assert.equal(port.name, 'Renommé depuis un pays legacy')
  })
})
