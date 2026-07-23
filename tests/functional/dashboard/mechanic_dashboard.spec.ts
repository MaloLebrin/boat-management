import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { BoatFactory } from '#database/factories/boat_factory'
import { createAdminUser, createMechanicUser, createMemberUser } from '#tests/functional/helpers'
import BoatMaintenanceTask from '#models/boat_maintenance_task'
import { DateTime } from 'luxon'

test.group('Dashboard — dedicated mechanic view (#417)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('a mechanic lands on the dedicated dashboard/mechanic page with overdue and upcoming interventions', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const orgId = admin.organizationId!
    const boat = await BoatFactory.merge({ organizationId: orgId }).create()

    const overdue = await BoatMaintenanceTask.create({
      boatId: boat.id,
      subject: 'engine',
      title: 'Vidange en retard',
      status: 'open',
      dueAt: DateTime.now().minus({ days: 5 }),
      dueEngineHours: null,
    })
    const soon = await BoatMaintenanceTask.create({
      boatId: boat.id,
      subject: 'hull',
      title: 'Carénage bientôt',
      status: 'open',
      dueAt: DateTime.now().plus({ days: 10 }),
      dueEngineHours: null,
    })
    // Planifiée au-delà de la fenêtre « à venir » : ne doit apparaître dans aucune liste.
    const planned = await BoatMaintenanceTask.create({
      boatId: boat.id,
      subject: 'sail',
      title: 'Tâche lointaine',
      status: 'open',
      dueAt: DateTime.now().plus({ days: 120 }),
      dueEngineHours: null,
    })

    const mechanic = await createMechanicUser(orgId)

    const response = await client.get('/dashboard').loginAs(mechanic).withInertia()

    response.assertStatus(200)
    response.assertInertiaComponent('dashboard/mechanic')

    const props = response.inertiaProps as {
      overdueTasks: { id: number }[]
      soonTasks: { id: number }[]
    }

    assert.sameMembers(
      props.overdueTasks.map((t) => t.id),
      [overdue.id]
    )
    assert.sameMembers(
      props.soonTasks.map((t) => t.id),
      [soon.id]
    )
    const allIds = [...props.overdueTasks, ...props.soonTasks].map((t) => t.id)
    assert.notInclude(allIds, planned.id)
  })

  test('an admin still gets the full dashboard, not the mechanic view', async ({ client }) => {
    const admin = await createAdminUser()

    const response = await client.get('/dashboard').loginAs(admin).withInertia()

    response.assertStatus(200)
    response.assertInertiaComponent('dashboard')
  })

  test('a member still gets the full dashboard, not the mechanic view', async ({ client }) => {
    const admin = await createAdminUser()
    const member = await createMemberUser(admin.organizationId!)

    const response = await client.get('/dashboard').loginAs(member).withInertia()

    response.assertStatus(200)
    response.assertInertiaComponent('dashboard')
  })
})
