import { test } from '@japa/runner'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatIncidentFactory } from '#database/factories/boat_incident_factory'
import BoatIncident from '#models/boat_incident'
import { UPDATE_INCIDENT_ACTION } from '#shared/constants/offline_queue'
import { toIncident } from '#transformers/boat_transformer'
import { createAdminUser } from '#tests/functional/helpers'
import { truncateDb } from '#tests/utils/db'

/**
 * Verrou optimiste de l'édition d'incident (#970).
 *
 * Une édition saisie en mer est rejouée des semaines plus tard avec
 * `_expectedUpdatedAt`, l'`updatedAt` que le formulaire avait lu. Si le quai a
 * modifié l'incident entre-temps, le contrôleur flashe le conflit au lieu
 * d'écraser — dernier ❌ du tableau de `docs/domain/offline-queue.md`.
 */

const STALE = '2000-01-01T00:00:00.000+00:00'

async function setup() {
  const user = await createAdminUser()
  const boat = await BoatFactory.merge({
    organizationId: user.organizationId!,
    name: 'Albatros',
  }).create()
  const incident = await BoatIncidentFactory.merge({
    boatId: boat.id,
    organizationId: boat.organizationId,
    description: 'version du quai',
    location: 'Lorient',
  }).create()
  // Relu en base : le jeton se calcule comme la page le servirait.
  await incident.refresh()
  return { user, boat, incident }
}

test.group('Incidents — verrou optimiste du rejeu hors-ligne (#970)', (group) => {
  group.each.setup(() => truncateDb())

  test('un jeton périmé lève le conflit sans rien écrire', async ({ client, assert }) => {
    const { user, boat, incident } = await setup()

    const response = await client
      .put(`/boats/${boat.id}/incidents/${incident.id}`)
      .loginAs(user)
      .json({ description: 'version de la mer', _expectedUpdatedAt: STALE })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('conflictType', UPDATE_INCIDENT_ACTION)
    response.assertFlashMissing('success')
    response.assertFlashMissing('rejectedType')

    await incident.refresh()
    assert.equal(incident.description, 'version du quai')
  })

  test('conflictData porte la ligne du serveur, le nom du bateau et le nouveau jeton', async ({
    client,
    assert,
  }) => {
    const { user, boat, incident } = await setup()

    const response = await client
      .put(`/boats/${boat.id}/incidents/${incident.id}`)
      .loginAs(user)
      .json({ description: 'version de la mer', _expectedUpdatedAt: STALE })
      .redirects(0)

    const raw = (response.flashMessages() as Record<string, unknown>).conflictData
    assert.isString(raw)
    const data = JSON.parse(raw as string) as Record<string, unknown>
    assert.containsSubset(data, {
      id: incident.id,
      boatName: 'Albatros',
      description: 'version du quai',
      location: 'Lorient',
      type: 'engine_failure',
      status: 'open',
      insuranceClaimed: false,
      insuranceClaimRef: null,
    })
    // Le jeton rendu est celui que la page aurait servi : le rejeu « garder ma
    // version » le renvoie et doit franchir le verrou.
    assert.equal(data.updatedAt, toIncident(incident).updatedAt)
    assert.isString(data.occurredAt)
  })

  test('le jeton servi par la page franchit le verrou', async ({ client, assert }) => {
    const { user, boat, incident } = await setup()

    const response = await client
      .put(`/boats/${boat.id}/incidents/${incident.id}`)
      .loginAs(user)
      .json({
        description: 'version de la mer',
        _expectedUpdatedAt: toIncident(incident).updatedAt,
      })
      .redirects(0)

    response.assertFlashMissing('conflictType')
    response.assertFlashMessage('success')
    const reloaded = await BoatIncident.findOrFail(incident.id)
    assert.equal(reloaded.description, 'version de la mer')
  })

  test('sans jeton (édition en ligne), rien ne change', async ({ client, assert }) => {
    const { user, boat, incident } = await setup()

    const response = await client
      .put(`/boats/${boat.id}/incidents/${incident.id}`)
      .loginAs(user)
      .json({ description: 'édition en ligne' })
      .redirects(0)

    response.assertFlashMissing('conflictType')
    const reloaded = await BoatIncident.findOrFail(incident.id)
    assert.equal(reloaded.description, 'édition en ligne')
  })
})
