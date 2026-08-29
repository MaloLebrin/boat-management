import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Boat from '#models/boat'
import { BoatFactory } from '#database/factories/boat_factory'
import { createAdminUser } from '#tests/functional/helpers'

/**
 * Pavillon en liste fermée ISO 3166-1 alpha-2 (#580).
 *
 * Le formulaire n'avait aucun `maxlength` alors que le validator plafonnait à
 * 8 caractères : on pouvait taper « République Française » et se faire rejeter
 * au submit sans comprendre pourquoi. Les deux côtés parlent désormais la même
 * liste.
 */
test.group('Boat flag country (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('PUT enregistre un code pays de la liste', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    await client.put(`/boats/${boat.id}`).loginAs(user).form({ name: boat.name, flagCountry: 'FR' })

    await boat.refresh()
    assert.equal(boat.flagCountry, 'FR')
  })

  test('PUT refuse une valeur hors liste', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({
      organizationId: user.organizationId!,
      flagCountry: 'FR',
    }).create()

    await client
      .put(`/boats/${boat.id}`)
      .loginAs(user)
      .form({ name: boat.name, flagCountry: 'FRANCE' })

    await boat.refresh()
    assert.equal(boat.flagCountry, 'FR', 'le pavillon ne doit pas avoir bougé')
  })

  test('PUT vide le pavillon quand le select est laissé vide', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({
      organizationId: user.organizationId!,
      flagCountry: 'FR',
    }).create()

    await client.put(`/boats/${boat.id}`).loginAs(user).form({ name: boat.name, flagCountry: '' })

    await boat.refresh()
    assert.isNull(boat.flagCountry)
  })

  /**
   * Le critère central de l'issue : la migration conserve les pavillons qu'elle
   * n'a pas su normaliser, et un bateau qui en porte un doit rester éditable.
   * Le champ est nullable, donc ne pas le renvoyer ne bloque rien.
   */
  test('un bateau portant un ancien pavillon libre reste éditable', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    // La valeur legacy est posée en base sans passer par le validator, comme
    // l'aurait laissée la migration best-effort.
    await Boat.query().where('id', boat.id).update({ flagCountry: 'Bretagne' })

    const response = await client
      .put(`/boats/${boat.id}`)
      .loginAs(user)
      .form({ name: 'Renommé depuis un pavillon legacy' })
      .redirects(0)

    response.assertStatus(302)
    await boat.refresh()
    assert.equal(boat.name, 'Renommé depuis un pavillon legacy')
  })
})
