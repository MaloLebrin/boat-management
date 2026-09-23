import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import AuditLog from '#models/audit_log'
import BoatIncident from '#models/boat_incident'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { BoatEnginePartFactory } from '#database/factories/boat_engine_part_factory'
import { BoatIncidentFactory } from '#database/factories/boat_incident_factory'
import { BoatSailFactory } from '#database/factories/boat_sail_factory'
import {
  createAdminUser,
  createBoatOwnerUser,
  createMechanicUser,
  createMemberUser,
} from '#tests/functional/helpers'
import type { AuditAction } from '#shared/types/audit_log'

/**
 * Tests de caractérisation de `BoatIncidentsController` (vague 0.4 du plan de
 * refactorisation) : le contrôleur n'avait aucun test avant que la résolution
 * du bateau (`loadBoat`) ne soit mutualisée en vague 1.4.
 */

const VALID_INCIDENT = {
  occurredAt: '2026-06-01 10:00:00',
  tzOffsetMinutes: 0,
  type: 'engine_failure',
  location: '  Cap Croisette  ',
  description: '  Surchauffe moteur  ',
  insuranceClaimed: 'true',
  insuranceClaimRef: ' CLM-42 ',
}

async function adminWithBoat() {
  const admin = await createAdminUser()
  const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
  return { admin, boat }
}

test.group('Incidents — POST /boats/:boatId/incidents (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('redirige vers /login sans authentification', async ({ client }) => {
    const response = await client.post('/boats/1/incidents').form(VALID_INCIDENT).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test("un admin déclare un incident ouvert, champs nettoyés, puis revient sur l'onglet", async ({
    client,
    assert,
  }) => {
    const { admin, boat } = await adminWithBoat()

    const response = await client
      .post(`/boats/${boat.id}/incidents`)
      .loginAs(admin)
      .form(VALID_INCIDENT)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', `/boats/${boat.id}?tab=incidents`)
    response.assertFlashMessage('success', 'Incident reported.')

    const incident = await BoatIncident.query().where('boatId', boat.id).firstOrFail()
    assert.equal(incident.organizationId, boat.organizationId)
    assert.equal(incident.type, 'engine_failure')
    assert.equal(incident.status, 'open')
    assert.isNull(incident.closedAt)
    assert.equal(incident.location, 'Cap Croisette')
    assert.equal(incident.description, 'Surchauffe moteur')
    assert.isTrue(incident.insuranceClaimed)
    assert.equal(incident.insuranceClaimRef, 'CLM-42')
    assert.equal(incident.occurredAt.toUTC().toISO(), '2026-06-01T10:00:00.000Z')
  })

  test('un membre peut déclarer un incident (capacité incidents.create)', async ({
    client,
    assert,
  }) => {
    const { admin, boat } = await adminWithBoat()
    const member = await createMemberUser(admin.organizationId!)

    await client.post(`/boats/${boat.id}/incidents`).loginAs(member).form(VALID_INCIDENT)

    assert.equal(
      await BoatIncident.query()
        .where('boatId', boat.id)
        .count('* as total')
        .first()
        .then((r) => Number(r?.$extras.total)),
      1
    )
  })

  test('un mécanicien et un propriétaire sont refusés (redirection, rien de créé)', async ({
    client,
    assert,
  }) => {
    const { admin, boat } = await adminWithBoat()
    const mechanic = await createMechanicUser(admin.organizationId!)
    const owner = await createBoatOwnerUser(admin.organizationId!)
    await boat.related('owners').attach([owner.id])

    for (const user of [mechanic, owner]) {
      // Bouncer renvoie les soumissions de formulaire refusées en redirection
      // (pas un 403 brut) — cf. tests/functional/maintenance/mechanic_access.spec.ts.
      const response = await client
        .post(`/boats/${boat.id}/incidents`)
        .loginAs(user)
        .form(VALID_INCIDENT)
        .redirects(0)
      response.assertStatus(302)
    }

    assert.isNull(await BoatIncident.query().where('boatId', boat.id).first())
  })

  test("le bateau d'une autre organisation renvoie vers /boats sans rien créer", async ({
    client,
    assert,
  }) => {
    const { boat } = await adminWithBoat()
    const attacker = await createAdminUser()

    const response = await client
      .post(`/boats/${boat.id}/incidents`)
      .loginAs(attacker)
      .form(VALID_INCIDENT)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/boats')
    assert.isNull(await BoatIncident.query().where('boatId', boat.id).first())
  })

  test('une description absente est refusée par la validation', async ({ client, assert }) => {
    const { admin, boat } = await adminWithBoat()

    const response = await client
      .post(`/boats/${boat.id}/incidents`)
      .loginAs(admin)
      .form({ ...VALID_INCIDENT, description: '' })
      .redirects(0)

    response.assertStatus(302)
    assert.isNull(await BoatIncident.query().where('boatId', boat.id).first())
  })
})

test.group(
  'Incidents — PUT et DELETE /boats/:boatId/incidents/:incidentId (functional)',
  (group) => {
    group.each.setup(() => truncateDb())

    test('clôturer un incident horodate closedAt ; le rouvrir le remet à null', async ({
      client,
      assert,
    }) => {
      const { admin, boat } = await adminWithBoat()
      const incident = await BoatIncidentFactory.merge({
        boatId: boat.id,
        organizationId: boat.organizationId,
      }).create()

      const closing = await client
        .put(`/boats/${boat.id}/incidents/${incident.id}`)
        .loginAs(admin)
        .form({ status: 'closed', description: 'Réparé au port' })
        .redirects(0)

      closing.assertStatus(302)
      closing.assertHeader('location', `/boats/${boat.id}?tab=incidents`)
      closing.assertFlashMessage('success', 'Incident updated.')
      await incident.refresh()
      assert.equal(incident.status, 'closed')
      assert.isNotNull(incident.closedAt)
      assert.equal(incident.description, 'Réparé au port')

      await client
        .put(`/boats/${boat.id}/incidents/${incident.id}`)
        .loginAs(admin)
        .form({ status: 'in_progress' })

      await incident.refresh()
      assert.equal(incident.status, 'in_progress')
      assert.isNull(incident.closedAt)
    })

    test("un incident inconnu ou d'un autre bateau renvoie le flash « not found »", async ({
      client,
    }) => {
      const { admin, boat } = await adminWithBoat()
      const otherBoat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
      const foreign = await BoatIncidentFactory.merge({
        boatId: otherBoat.id,
        organizationId: otherBoat.organizationId,
      }).create()

      const response = await client
        .put(`/boats/${boat.id}/incidents/${foreign.id}`)
        .loginAs(admin)
        .form({ status: 'closed' })
        .redirects(0)

      response.assertStatus(302)
      response.assertHeader('location', `/boats/${boat.id}?tab=incidents`)
      response.assertFlashMessage('error', 'Incident not found.')
    })

    test('un admin supprime un incident', async ({ client, assert }) => {
      const { admin, boat } = await adminWithBoat()
      const incident = await BoatIncidentFactory.merge({
        boatId: boat.id,
        organizationId: boat.organizationId,
      }).create()

      const response = await client
        .delete(`/boats/${boat.id}/incidents/${incident.id}`)
        .loginAs(admin)
        .redirects(0)

      response.assertStatus(302)
      response.assertFlashMessage('success', 'Incident deleted.')
      assert.isNull(await BoatIncident.find(incident.id))
    })

    test('un membre ne peut pas supprimer (incidents.delete est réservé aux admins)', async ({
      client,
      assert,
    }) => {
      const { admin, boat } = await adminWithBoat()
      const member = await createMemberUser(admin.organizationId!)
      const incident = await BoatIncidentFactory.merge({
        boatId: boat.id,
        organizationId: boat.organizationId,
      }).create()

      const response = await client
        .delete(`/boats/${boat.id}/incidents/${incident.id}`)
        .loginAs(member)
        .redirects(0)

      response.assertStatus(302)
      assert.isNotNull(await BoatIncident.find(incident.id))
    })
  }
)

test.group('Incidents — cible équipement ou pièce (#813)', (group) => {
  group.each.setup(() => truncateDb())

  test('un incident déclaré sur un moteur du bateau porte sa FK', async ({ client, assert }) => {
    const { admin, boat } = await adminWithBoat()
    const engine = await BoatEngineFactory.merge({ boatId: boat.id }).create()

    await client
      .post(`/boats/${boat.id}/incidents`)
      .loginAs(admin)
      .form({ ...VALID_INCIDENT, boatEngineId: String(engine.id) })

    const incident = await BoatIncident.query().where('boatId', boat.id).firstOrFail()
    assert.equal(incident.boatEngineId, engine.id)
    assert.isNull(incident.boatSailId)
    assert.isNull(incident.boatEnginePartId)
  })

  test("le moteur d'un autre bateau est refusé, rien n'est créé", async ({ client, assert }) => {
    const { admin, boat } = await adminWithBoat()
    const otherBoat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const foreignEngine = await BoatEngineFactory.merge({ boatId: otherBoat.id }).create()

    const response = await client
      .post(`/boats/${boat.id}/incidents`)
      .loginAs(admin)
      .form({ ...VALID_INCIDENT, boatEngineId: String(foreignEngine.id) })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', `/boats/${boat.id}?tab=incidents`)
    response.assertFlashMessage('error', 'This equipment does not belong to this boat.')
    assert.lengthOf(await BoatIncident.query().where('boatId', boat.id), 0)
  })

  test('deux cibles à la fois sont refusées', async ({ client, assert }) => {
    const { admin, boat } = await adminWithBoat()
    const engine = await BoatEngineFactory.merge({ boatId: boat.id }).create()
    const sail = await BoatSailFactory.merge({ boatId: boat.id }).create()

    const response = await client
      .post(`/boats/${boat.id}/incidents`)
      .loginAs(admin)
      .form({ ...VALID_INCIDENT, boatEngineId: String(engine.id), boatSailId: String(sail.id) })
      .redirects(0)

    response.assertFlashMessage('error', 'An incident can target only one piece of equipment.')
    assert.lengthOf(await BoatIncident.query().where('boatId', boat.id), 0)
  })

  test("une pièce est bornée par son moteur : celle d'un autre bateau est refusée", async ({
    client,
    assert,
  }) => {
    const { admin, boat } = await adminWithBoat()
    const engine = await BoatEngineFactory.merge({ boatId: boat.id }).create()
    const part = await BoatEnginePartFactory.merge({ boatEngineId: engine.id }).create()
    const otherBoat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const foreignEngine = await BoatEngineFactory.merge({ boatId: otherBoat.id }).create()
    const foreignPart = await BoatEnginePartFactory.merge({
      boatEngineId: foreignEngine.id,
    }).create()

    const refused = await client
      .post(`/boats/${boat.id}/incidents`)
      .loginAs(admin)
      .form({ ...VALID_INCIDENT, boatEnginePartId: String(foreignPart.id) })
      .redirects(0)
    refused.assertFlashMessage('error', 'This equipment does not belong to this boat.')
    assert.lengthOf(await BoatIncident.query().where('boatId', boat.id), 0)

    await client
      .post(`/boats/${boat.id}/incidents`)
      .loginAs(admin)
      .form({ ...VALID_INCIDENT, boatEnginePartId: String(part.id) })

    const incident = await BoatIncident.query().where('boatId', boat.id).firstOrFail()
    assert.equal(incident.boatEnginePartId, part.id)
    assert.isNull(incident.boatEngineId)
  })

  test('la mise à jour change la cible, puis la retire quand toutes les clés sont à null', async ({
    client,
    assert,
  }) => {
    const { admin, boat } = await adminWithBoat()
    const engine = await BoatEngineFactory.merge({ boatId: boat.id }).create()
    const sail = await BoatSailFactory.merge({ boatId: boat.id }).create()
    const incident = await BoatIncidentFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
      boatEngineId: engine.id,
    }).create()

    await client
      .put(`/boats/${boat.id}/incidents/${incident.id}`)
      .loginAs(admin)
      .form({ boatSailId: String(sail.id) })
    await incident.refresh()
    assert.equal(incident.boatSailId, sail.id)
    assert.isNull(incident.boatEngineId)

    // Une mise à jour sans clé de cible ne touche pas à la cible
    await client
      .put(`/boats/${boat.id}/incidents/${incident.id}`)
      .loginAs(admin)
      .form({ status: 'in_progress' })
    await incident.refresh()
    assert.equal(incident.boatSailId, sail.id)

    await client.put(`/boats/${boat.id}/incidents/${incident.id}`).loginAs(admin).json({
      boatEngineId: null,
      boatSailId: null,
      boatRigId: null,
      boatSafetyEquipmentId: null,
      boatGenericEquipmentId: null,
      boatEnginePartId: null,
    })
    await incident.refresh()
    assert.isNull(incident.boatSailId)
    assert.isNull(incident.boatEngineId)
  })

  test("supprimer l'équipement visé conserve l'incident, rattaché au bateau entier", async ({
    assert,
  }) => {
    const { boat } = await adminWithBoat()
    const engine = await BoatEngineFactory.merge({ boatId: boat.id }).create()
    const incident = await BoatIncidentFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
      boatEngineId: engine.id,
    }).create()

    await engine.delete()

    await incident.refresh()
    assert.isNull(incident.boatEngineId)
  })
})

async function findLog(organizationId: number, action: AuditAction) {
  return await AuditLog.query()
    .where('organizationId', organizationId)
    .where('action', action)
    .first()
}

test.group('Incidents — déclarant, audit et droits de l’onglet (#816)', (group) => {
  group.each.setup(() => truncateDb())

  test("l'incident retient qui l'a déclaré", async ({ client, assert }) => {
    const { admin, boat } = await adminWithBoat()
    const member = await createMemberUser(admin.organizationId!)

    await client.post(`/boats/${boat.id}/incidents`).loginAs(member).form(VALID_INCIDENT)

    const incident = await BoatIncident.query().where('boatId', boat.id).firstOrFail()
    assert.equal(incident.createdBy, member.id)
  })

  test('la déclaration est journalisée en incident.create', async ({ client, assert }) => {
    const { admin, boat } = await adminWithBoat()

    await client.post(`/boats/${boat.id}/incidents`).loginAs(admin).form(VALID_INCIDENT)

    const incident = await BoatIncident.query().where('boatId', boat.id).firstOrFail()
    const log = await findLog(admin.organizationId!, 'incident.create')
    assert.isNotNull(log)
    assert.equal(log!.userId, admin.id)
    assert.equal(log!.entityType, 'incident')
    assert.equal(log!.entityId, incident.id)
    assert.deepEqual(log!.metadata, { boatName: boat.name, type: 'engine_failure' })
  })

  test('une déclaration refusée ne journalise rien', async ({ client, assert }) => {
    const { admin, boat } = await adminWithBoat()
    const engine = await BoatEngineFactory.merge({ boatId: boat.id }).create()
    const sail = await BoatSailFactory.merge({ boatId: boat.id }).create()

    await client
      .post(`/boats/${boat.id}/incidents`)
      .loginAs(admin)
      .form({ ...VALID_INCIDENT, boatEngineId: engine.id, boatSailId: sail.id })

    assert.isNull(await findLog(admin.organizationId!, 'incident.create'))
  })

  test('la mise à jour est journalisée en incident.update avec le statut atteint', async ({
    client,
    assert,
  }) => {
    const { admin, boat } = await adminWithBoat()
    const incident = await BoatIncidentFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
    }).create()

    await client
      .put(`/boats/${boat.id}/incidents/${incident.id}`)
      .loginAs(admin)
      .form({ status: 'closed' })

    const log = await findLog(admin.organizationId!, 'incident.update')
    assert.isNotNull(log)
    assert.equal(log!.userId, admin.id)
    assert.equal(log!.entityType, 'incident')
    assert.equal(log!.entityId, incident.id)
    assert.deepEqual(log!.metadata, {
      boatName: boat.name,
      type: incident.type,
      status: 'closed',
    })
  })

  test('un incident introuvable en mise à jour ne journalise rien', async ({ client, assert }) => {
    const { admin, boat } = await adminWithBoat()

    await client.put(`/boats/${boat.id}/incidents/999999`).loginAs(admin).form({ status: 'closed' })

    assert.isNull(await findLog(admin.organizationId!, 'incident.update'))
  })

  test('la suppression est journalisée en incident.delete', async ({ client, assert }) => {
    const { admin, boat } = await adminWithBoat()
    const incident = await BoatIncidentFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
    }).create()

    await client.delete(`/boats/${boat.id}/incidents/${incident.id}`).loginAs(admin)

    const log = await findLog(admin.organizationId!, 'incident.delete')
    assert.isNotNull(log)
    assert.equal(log!.userId, admin.id)
    assert.equal(log!.entityType, 'incident')
    assert.equal(log!.entityId, incident.id)
    assert.deepEqual(log!.metadata, { boatName: boat.name, type: incident.type })
  })

  test('la fiche bateau expose les trois droits incidents, lus sur IncidentPolicy', async ({
    client,
    assert,
  }) => {
    const { admin, boat } = await adminWithBoat()
    const member = await createMemberUser(admin.organizationId!)

    // `incidents.delete` est réservé aux admins ; un membre déclare et modifie.
    // (Le propriétaire passe par son portail `/owner/boats`, pas par cette page.)
    const expectations = [
      { user: admin, create: true, edit: true, remove: true },
      { user: member, create: true, edit: true, remove: false },
    ]

    for (const { user, create, edit, remove } of expectations) {
      const response = await client.get(`/boats/${boat.id}`).loginAs(user).withInertia()
      response.assertStatus(200)
      const props = response.inertiaProps as {
        canCreateIncidents: boolean
        canEditIncidents: boolean
        canDeleteIncidents: boolean
      }
      assert.equal(props.canCreateIncidents, create)
      assert.equal(props.canEditIncidents, edit)
      assert.equal(props.canDeleteIncidents, remove)
    }
  })
})
