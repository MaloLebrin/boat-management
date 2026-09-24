import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { BoatFactory } from '#database/factories/boat_factory'
import { NavigationLogFactory } from '#database/factories/navigation_log_factory'
import { BoatIncidentFactory } from '#database/factories/boat_incident_factory'
import { BoatSailFactory } from '#database/factories/boat_sail_factory'
import BoatFuelLog from '#models/boat_fuel_log'
import BoatIncident from '#models/boat_incident'
import NavigationLog from '#models/navigation_log'
import NavigationLogEntry from '#models/navigation_log_entry'
import { createAdminUser, createMemberUser } from '#tests/functional/helpers'
import {
  CREATE_FUEL_LOG_ACTION,
  CREATE_INCIDENT_ACTION,
  CREATE_NAVIGATION_LOG_ACTION,
  CREATE_NAVIGATION_LOG_ENTRY_ACTION,
  INCREMENT_ENGINE_HOURS_ACTION,
  UPDATE_INCIDENT_ACTION,
} from '#shared/constants/offline_queue'

/**
 * Les marqueurs de rejeu des quatre créations du domaine terrain (#727).
 *
 * `drainQueue` ne distingue un refus métier d'un succès que par `rejectedType` :
 * un refus rendu en `flash('error')` + redirection est, côté Inertia, un
 * `onSuccess`. Sans marqueur, l'action est **supprimée de la file**,
 * `pendingCount` retombe à zéro et l'utilisateur voit
 * `common.offline.syncSuccess`.
 *
 * Le scénario : un équipier saisit ses points en mer, sans réseau ; le skipper
 * clôture la sortie depuis le quai ; au retour du réseau chaque point est
 * refusé — et était jeté sans trace. C'est exactement ce que la file existe
 * pour empêcher.
 *
 * Le chemin passant porte `createdResourceType` / `createdResourceId` : c'est
 * lui qui désarme le piège des dépendances, le jour où une création posera un
 * `tempId` que ses filles référencent.
 */

test.group('File hors-ligne — le refus des créations porte son rejectedType', (group) => {
  group.each.setup(() => truncateDb())

  test('une seconde sortie en cours est refusée avec son marqueur', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: user.organizationId!,
      status: 'in_progress',
    }).create()

    const response = await client
      .post(`/boats/${boat.id}/navigation-logs`)
      .loginAs(user)
      .form({ departedAt: '2024-02-01T10:00' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('rejectedType', CREATE_NAVIGATION_LOG_ACTION)
    response.assertFlashMessage('error')
    assert.lengthOf(await NavigationLog.query().where('boatId', boat.id), 1)
  })

  test('un point sur une sortie clôturée est refusé avec son marqueur', async ({
    client,
    assert,
  }) => {
    // Le cas du scénario : un `member` ne corrige pas une sortie clôturée.
    const admin = await createAdminUser()
    const member = await createMemberUser(admin.organizationId!)
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const log = await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: admin.organizationId!,
      status: 'completed',
    }).create()

    const response = await client
      .post(`/boats/${boat.id}/navigation-logs/${log.id}/entries`)
      .loginAs(member)
      .form({ recordedAt: '2024-06-01T10:00' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('rejectedType', CREATE_NAVIGATION_LOG_ENTRY_ACTION)
    assert.lengthOf(await NavigationLogEntry.query().where('navigationLogId', log.id), 0)
  })

  test('un plein incohérent est refusé avec son marqueur', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/fuel-logs`)
      .loginAs(user)
      .form({
        // `fueledAt` est une date seule (`YYYY-MM-DD`), cf. son validateur.
        fueledAt: '2024-06-01',
        quantityLiters: 100,
        pricePerLiter: 2,
        // 100 × 2 ≠ 5 : `inconsistentCost`.
        totalCost: 5,
      })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('rejectedType', CREATE_FUEL_LOG_ACTION)
    response.assertFlashMessage('error')
    assert.lengthOf(await BoatFuelLog.query().where('boatId', boat.id), 0)
  })

  test('un incrément sur un moteur disparu est refusé avec son marqueur', async ({ client }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .patch(`/boats/${boat.id}/engines/999999/hours`)
      .loginAs(user)
      .form({ hoursIncrement: 3 })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('rejectedType', INCREMENT_ENGINE_HOURS_ACTION)
    response.assertFlashMessage('error')
  })
})

test.group('File hors-ligne — le chemin passant porte son createdResourceId', (group) => {
  group.each.setup(() => truncateDb())

  test('une sortie créée rend son identifiant réel', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/navigation-logs`)
      .loginAs(user)
      .form({ departedAt: '2024-01-01T10:00' })
      .redirects(0)

    const log = await NavigationLog.query().where('boatId', boat.id).firstOrFail()
    response.assertFlashMessage('createdResourceType', CREATE_NAVIGATION_LOG_ACTION)
    response.assertFlashMessage('createdResourceId', String(log.id))
    assert.isAbove(log.id, 0)
  })

  test('un point créé rend son identifiant réel', async ({ client }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const log = await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: user.organizationId!,
      status: 'in_progress',
    }).create()

    const response = await client
      .post(`/boats/${boat.id}/navigation-logs/${log.id}/entries`)
      .loginAs(user)
      .form({ recordedAt: '2024-06-01T10:00' })
      .redirects(0)

    const entry = await NavigationLogEntry.query().where('navigationLogId', log.id).firstOrFail()
    response.assertFlashMessage('createdResourceType', CREATE_NAVIGATION_LOG_ENTRY_ACTION)
    response.assertFlashMessage('createdResourceId', String(entry.id))
  })

  test('un plein créé rend son identifiant réel', async ({ client }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    await BoatEngineFactory.merge({ boatId: boat.id }).create()

    const response = await client
      .post(`/boats/${boat.id}/fuel-logs`)
      .loginAs(user)
      .form({ fueledAt: '2024-06-01', quantityLiters: 40 })
      .redirects(0)

    const fuelLog = await BoatFuelLog.query().where('boatId', boat.id).firstOrFail()
    response.assertFlashMessage('createdResourceType', CREATE_FUEL_LOG_ACTION)
    response.assertFlashMessage('createdResourceId', String(fuelLog.id))
  })

  /**
   * L'incident a rejoint les créations qui rendent leur identifiant, non pour
   * la file — il n'a pas de `tempId` — mais parce que le formulaire enchaîne
   * l'envoi des photos, désormais obligatoires, sur `…/incidents/:id/photos`.
   */
  test('un incident créé rend son identifiant réel', async ({ client }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/incidents`)
      .loginAs(user)
      .form({
        occurredAt: '2026-06-01 10:00:00',
        tzOffsetMinutes: 0,
        type: 'engine_failure',
        description: 'Surchauffe moteur',
      })
      .redirects(0)

    const incident = await BoatIncident.query().where('boatId', boat.id).firstOrFail()
    response.assertFlashMessage('createdResourceType', CREATE_INCIDENT_ACTION)
    response.assertFlashMessage('createdResourceId', String(incident.id))
  })
})

/**
 * Les incidents (#816) : dernier trou du protocole, enfilés hors-ligne depuis
 * #106 sans que `BoatIncidentsController` renvoie jamais leur marqueur. Un
 * incident refusé au rejeu — cible d'un autre bateau, deux cibles à la fois,
 * incident supprimé entre-temps — était détruit sous un toast de succès.
 */
test.group('File hors-ligne — le refus des incidents porte son rejectedType (#816)', (group) => {
  group.each.setup(() => truncateDb())

  const VALID_INCIDENT = {
    occurredAt: '2026-06-01 10:00:00',
    tzOffsetMinutes: 0,
    type: 'engine_failure',
    description: 'Surchauffe moteur',
  }

  test('une déclaration sur deux cibles est refusée avec son marqueur', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await BoatEngineFactory.merge({ boatId: boat.id }).create()
    const sail = await BoatSailFactory.merge({ boatId: boat.id }).create()

    const response = await client
      .post(`/boats/${boat.id}/incidents`)
      .loginAs(user)
      .form({ ...VALID_INCIDENT, boatEngineId: engine.id, boatSailId: sail.id })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('rejectedType', CREATE_INCIDENT_ACTION)
    response.assertFlashMessage('error')
    assert.isNull(await BoatIncident.query().where('boatId', boat.id).first())
  })

  test("une édition visant l'équipement d'un autre bateau est refusée avec son marqueur", async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const otherBoat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const foreignEngine = await BoatEngineFactory.merge({ boatId: otherBoat.id }).create()
    const incident = await BoatIncidentFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
    }).create()

    const response = await client
      .put(`/boats/${boat.id}/incidents/${incident.id}`)
      .loginAs(user)
      .form({ boatEngineId: foreignEngine.id })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('rejectedType', UPDATE_INCIDENT_ACTION)
    await incident.refresh()
    assert.isNull(incident.boatEngineId)
  })

  test("l'édition d'un incident supprimé entre-temps est refusée avec son marqueur", async ({
    client,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .put(`/boats/${boat.id}/incidents/999999`)
      .loginAs(user)
      .form({ status: 'closed' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('rejectedType', UPDATE_INCIDENT_ACTION)
    response.assertFlashMessage('error', 'Incident not found.')
  })

  test('une déclaration acceptée ne porte aucun marqueur de refus', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/incidents`)
      .loginAs(user)
      .form(VALID_INCIDENT)
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMissing('rejectedType')
    assert.isNotNull(await BoatIncident.query().where('boatId', boat.id).first())
  })
})
