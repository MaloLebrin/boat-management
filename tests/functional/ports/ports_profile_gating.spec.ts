import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import Port from '#models/port'
import Pontoon from '#models/pontoon'
import { PortFactory } from '#database/factories/port_factory'
import { PontoonFactory } from '#database/factories/pontoon_factory'
import { SpotFactory } from '#database/factories/spot_factory'
import { createPlanUserWithProfile } from '#tests/functional/helpers'

/**
 * Garde de **profil** sur la cartographie de port : une organisation déclarée
 * « particulier » à l'inscription (`organizations.type === 'private'`) n'a pas
 * de marina à modéliser, quel que soit son plan.
 *
 * Fichier distinct de `ports_plan_gating.spec.ts` : les deux gardes ont des
 * redirections et des messages différents — la garde de plan renvoie vers la
 * facturation avec un upsell, celle-ci vers le dashboard, parce qu'aucun
 * changement d'abonnement n'ouvrira la section.
 */
test.group('Ports — garde de profil « particulier »', (group) => {
  group.each.setup(() => truncateDb())

  test('GET /ports redirige un compte Pro particulier vers le dashboard', async ({ client }) => {
    const user = await createPlanUserWithProfile('pro', 'private')

    const response = await client.get('/ports').loginAs(user).redirects(0)

    response.assertStatus(302)
    // Surtout pas /settings/billing : la facturation n'y peut rien.
    response.assertHeader('location', '/dashboard')
  })

  test('GET /ports/new est fermé à un compte Pro particulier', async ({ client }) => {
    const user = await createPlanUserWithProfile('pro', 'private')

    const response = await client.get('/ports/new').loginAs(user).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/dashboard')
  })

  test('GET /ports/:id est fermé même sur un port de son organisation', async ({ client }) => {
    const user = await createPlanUserWithProfile('pro', 'private')
    const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client.get(`/ports/${port.id}`).loginAs(user).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/dashboard')
  })

  test('POST /ports ne crée pas de port pour un compte Pro particulier', async ({
    client,
    assert,
  }) => {
    const user = await createPlanUserWithProfile('pro', 'private')

    const response = await client
      .post('/ports')
      .loginAs(user)
      .form({ name: 'Port Particulier' })
      .redirects(0)

    response.assertHeader('location', '/dashboard')
    assert.isNull(await Port.findBy('name', 'Port Particulier'))
  })

  test('POST /ports/:portId/pontoons est fermé à un compte Pro particulier', async ({
    client,
    assert,
  }) => {
    const user = await createPlanUserWithProfile('pro', 'private')
    const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/ports/${port.id}/pontoons`)
      .loginAs(user)
      .form({ name: 'Ponton Particulier' })
      .redirects(0)

    response.assertHeader('location', '/dashboard')
    assert.isNull(await Pontoon.findBy('name', 'Ponton Particulier'))
  })

  test('DELETE /ports/:id ne supprime rien — les données sont conservées', async ({
    client,
    assert,
  }) => {
    const user = await createPlanUserWithProfile('pro', 'private')
    const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()

    await client.delete(`/ports/${port.id}`).loginAs(user).redirects(0)

    assert.isNotNull(await Port.find(port.id))
  })

  test('le profil ferme la section même au plan Entreprise', async ({ client }) => {
    const user = await createPlanUserWithProfile('enterprise', 'private')

    const response = await client.get('/ports').loginAs(user).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/dashboard')
  })

  test('un profil professionnel garde l’accès', async ({ client }) => {
    const user = await createPlanUserWithProfile('pro', 'marina')

    const response = await client.get('/ports').loginAs(user)

    response.assertStatus(200)
  })

  test('un profil non renseigné garde l’accès', async ({ client }) => {
    // Comptes antérieurs à la collecte du profil, jamais backfillés : une
    // absence de déclaration n'est pas une déclaration de « particulier ».
    const user = await createPlanUserWithProfile('pro', null)

    const response = await client.get('/ports').loginAs(user)

    response.assertStatus(200)
  })

  test('les ports existants réapparaissent si le profil change', async ({ client, assert }) => {
    const user = await createPlanUserWithProfile('pro', 'private')
    const port = await PortFactory.merge({
      organizationId: user.organizationId!,
      name: 'Port Retrouvé',
    }).create()

    const closed = await client.get('/ports').loginAs(user).redirects(0)
    closed.assertStatus(302)

    const organization = await user.related('organization').query().firstOrFail()
    organization.type = 'marina'
    await organization.save()

    const reopened = await client.get('/ports').loginAs(user).withInertia()

    reopened.assertStatus(200)
    const props = reopened.inertiaProps as { ports: { id: number }[] }
    assert.isTrue(props.ports.some((p) => p.id === port.id))
  })

  test('un port existant reste invisible du formulaire bateau', async ({ client, assert }) => {
    const user = await createPlanUserWithProfile('pro', 'private')
    const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()
    const pontoon = await PontoonFactory.merge({ portId: port.id }).create()
    await SpotFactory.merge({
      pontoonId: pontoon.id,
      organizationId: user.organizationId!,
    }).create()

    const response = await client.get('/boats/new').loginAs(user).withInertia()

    response.assertStatus(200)
    const props = response.inertiaProps as { ports: unknown[]; portOptions: unknown[] }
    assert.deepEqual(props.ports, [])
    assert.deepEqual(props.portOptions, [])
  })

  test('la prop partagée organizationType est exposée au front', async ({ client, assert }) => {
    const user = await createPlanUserWithProfile('pro', 'private')

    const response = await client.get('/dashboard').loginAs(user).withInertia()

    response.assertStatus(200)
    const props = response.inertiaProps as { organizationType: string | null }
    assert.equal(props.organizationType, 'private')
  })
})
