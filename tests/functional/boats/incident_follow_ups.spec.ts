import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import AuditLog from '#models/audit_log'
import BoatEquipmentAction from '#models/boat_equipment_action'
import BoatMaintenanceTask from '#models/boat_maintenance_task'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { BoatEquipmentActionFactory } from '#database/factories/boat_equipment_action_factory'
import { BoatIncidentFactory } from '#database/factories/boat_incident_factory'
import { BoatMaintenanceTaskFactory } from '#database/factories/boat_maintenance_task_factory'
import { createAdminUser } from '#tests/functional/helpers'
import { assertPageContract } from '#tests/support/inertia_page'
import type { BoatEquipmentActionRow } from '#shared/types/equipment_action'

/**
 * Suites d'un incident (#815) : une tâche ou une action créée depuis un
 * incident le trace par `boat_incident_id`, borné au bateau ; supprimer
 * l'incident conserve la suite.
 */
async function adminWithIncident() {
  const admin = await createAdminUser()
  const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
  const incident = await BoatIncidentFactory.merge({
    boatId: boat.id,
    organizationId: boat.organizationId,
  }).create()
  return { admin, boat, incident }
}

async function foreignIncident(organizationId: number) {
  const otherBoat = await BoatFactory.merge({ organizationId }).create()
  return await BoatIncidentFactory.merge({
    boatId: otherBoat.id,
    organizationId: otherBoat.organizationId,
  }).create()
}

test.group('Incidents — suites : tâche de maintenance (#815)', (group) => {
  group.each.setup(() => truncateDb())

  test("une tâche créée depuis l'incident le trace et l'audit porte incidentId", async ({
    client,
    assert,
  }) => {
    const { admin, boat, incident } = await adminWithIncident()
    const incidentPage = `/boats/${boat.id}/incidents/${incident.id}`

    const response = await client
      .post(`/boats/${boat.id}/maintenance-tasks`)
      .loginAs(admin)
      .header('referer', incidentPage)
      .form({ title: 'Engine failure', boatIncidentId: String(incident.id) })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', incidentPage)
    response.assertFlashMessage('success', 'Maintenance task created.')

    const task = await BoatMaintenanceTask.query().where('boatId', boat.id).firstOrFail()
    assert.equal(task.boatIncidentId, incident.id)

    const log = await AuditLog.query()
      .where('organizationId', admin.organizationId!)
      .where('action', 'maintenance_task.create')
      .firstOrFail()
    assert.equal(log.entityId, task.id)
    assert.equal(log.metadata?.incidentId, incident.id)
  })

  test("l'équipement de l'incident et l'incident sont tous deux tracés", async ({
    client,
    assert,
  }) => {
    const { admin, boat, incident } = await adminWithIncident()
    const engine = await BoatEngineFactory.merge({ boatId: boat.id }).create()

    await client
      .post(`/boats/${boat.id}/maintenance-tasks`)
      .loginAs(admin)
      .form({
        title: 'Engine failure',
        boatEngineId: String(engine.id),
        boatIncidentId: String(incident.id),
      })
      .redirects(0)

    const task = await BoatMaintenanceTask.query().where('boatId', boat.id).firstOrFail()
    assert.equal(task.subject, 'engine')
    assert.equal(task.boatEngineId, engine.id)
    assert.equal(task.boatIncidentId, incident.id)
  })

  test("un incident d'un autre bateau est refusé, aucune tâche créée", async ({
    client,
    assert,
  }) => {
    const { admin, boat } = await adminWithIncident()
    const foreign = await foreignIncident(admin.organizationId!)
    const referer = `/boats/${boat.id}?tab=incidents`

    const response = await client
      .post(`/boats/${boat.id}/maintenance-tasks`)
      .loginAs(admin)
      .header('referer', referer)
      .form({ title: 'Engine failure', boatIncidentId: String(foreign.id) })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', referer)
    response.assertFlashMessage('error', 'This incident does not belong to this boat.')
    assert.lengthOf(await BoatMaintenanceTask.query().where('boatId', boat.id), 0)
  })

  test("la récurrence d'une tâche liée ne reporte pas l'incident sur la suivante", async ({
    client,
    assert,
  }) => {
    const { admin, boat, incident } = await adminWithIncident()
    const task = await BoatMaintenanceTaskFactory.merge({
      boatId: boat.id,
      boatIncidentId: incident.id,
      recurrenceIntervalMonths: 6,
    }).create()

    await client
      .put(`/boats/${boat.id}/maintenance-tasks/${task.id}/done`)
      .loginAs(admin)
      .form({ doneAt: '2026-06-01' })
      .redirects(0)

    const tasks = await BoatMaintenanceTask.query().where('boatId', boat.id).orderBy('id', 'asc')
    assert.lengthOf(tasks, 2)
    assert.equal(tasks[0]!.boatIncidentId, incident.id)
    assert.isNull(tasks[1]!.boatIncidentId)
  })
})

test.group('Incidents — suites : action équipement (#815)', (group) => {
  group.each.setup(() => truncateDb())

  test("une action créée depuis l'incident le trace et revient sur la page d'origine", async ({
    client,
    assert,
  }) => {
    const { admin, boat, incident } = await adminWithIncident()
    const incidentPage = `/boats/${boat.id}/incidents/${incident.id}`

    const response = await client
      .post(`/boats/${boat.id}/equipment-actions`)
      .loginAs(admin)
      .header('referer', incidentPage)
      .form({ label: 'Engine failure', actionType: 'to_repair', boatIncidentId: incident.id })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', incidentPage)
    response.assertFlashMessage('success', 'Action added.')

    const action = await BoatEquipmentAction.query().where('boatId', boat.id).firstOrFail()
    assert.equal(action.boatIncidentId, incident.id)
    assert.equal(action.actionType, 'to_repair')
    assert.equal(action.createdBy, admin.id)
  })

  test("un incident d'un autre bateau est refusé, aucune action créée", async ({
    client,
    assert,
  }) => {
    const { admin, boat } = await adminWithIncident()
    const foreign = await foreignIncident(admin.organizationId!)
    const referer = `/boats/${boat.id}?tab=incidents`

    const response = await client
      .post(`/boats/${boat.id}/equipment-actions`)
      .loginAs(admin)
      .header('referer', referer)
      .form({ label: 'Engine failure', actionType: 'to_repair', boatIncidentId: foreign.id })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', referer)
    response.assertFlashMessage('error', 'This incident does not belong to this boat.')
    assert.lengthOf(await BoatEquipmentAction.query().where('boatId', boat.id), 0)
  })
})

test.group('Incidents — suites : page de détail et suppression (#815)', (group) => {
  group.each.setup(() => truncateDb())

  test('la page de détail ne liste que les suites de cet incident', async ({ client, assert }) => {
    const { admin, boat, incident } = await adminWithIncident()
    const other = await BoatIncidentFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
    }).create()
    const linkedTask = await BoatMaintenanceTaskFactory.merge({
      boatId: boat.id,
      boatIncidentId: incident.id,
    }).create()
    await BoatMaintenanceTaskFactory.merge({ boatId: boat.id, boatIncidentId: other.id }).create()
    await BoatMaintenanceTaskFactory.merge({ boatId: boat.id }).create()
    const linkedAction = await BoatEquipmentActionFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
      createdBy: admin.id,
      boatIncidentId: incident.id,
    }).create()
    await BoatEquipmentActionFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
      createdBy: admin.id,
    }).create()

    const response = await client
      .get(`/boats/${boat.id}/incidents/${incident.id}`)
      .loginAs(admin)
      .withInertia()

    assertPageContract(assert, response, 'boats/incident_show')
    const props = response.inertiaProps as {
      tasks: Array<{ id: number; boatIncidentId: number | null }>
      actions: BoatEquipmentActionRow[]
      canCreateTask: boolean
      canCreateAction: boolean
      equipment: { engines: unknown[]; genericEquipment: unknown[] }
    }
    assert.deepEqual(
      props.tasks.map((t) => t.id),
      [linkedTask.id]
    )
    assert.deepEqual(
      props.actions.map((a) => a.id),
      [linkedAction.id]
    )
    assert.equal(props.actions[0]!.boatIncidentId, incident.id)
    assert.isTrue(props.canCreateTask)
    assert.isTrue(props.canCreateAction)
    assert.isArray(props.equipment.genericEquipment)
  })

  test("supprimer l'incident conserve ses suites, qui perdent leur origine", async ({
    client,
    assert,
  }) => {
    const { admin, boat, incident } = await adminWithIncident()
    const task = await BoatMaintenanceTaskFactory.merge({
      boatId: boat.id,
      boatIncidentId: incident.id,
    }).create()
    const action = await BoatEquipmentActionFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
      createdBy: admin.id,
      boatIncidentId: incident.id,
    }).create()

    await client.delete(`/boats/${boat.id}/incidents/${incident.id}`).loginAs(admin).redirects(0)

    await task.refresh()
    await action.refresh()
    assert.isNull(task.boatIncidentId)
    assert.isNull(action.boatIncidentId)
  })
})
