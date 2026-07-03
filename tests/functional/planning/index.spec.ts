import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { BoatFactory } from '#database/factories/boat_factory'
import { createAdminUser } from '#tests/functional/helpers'
import BoatMaintenanceTask from '#models/boat_maintenance_task'
import { DateTime } from 'luxon'

test.group('Planning index — undated bucket (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('GET /planning separates tasks without dueAt/dueEngineHours into undatedTasks', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const undated = await BoatMaintenanceTask.create({
      boatId: boat.id,
      subject: 'engine',
      title: 'Tâche sans échéance',
      status: 'open',
      dueAt: null,
      dueEngineHours: null,
    })

    const planned = await BoatMaintenanceTask.create({
      boatId: boat.id,
      subject: 'hull',
      title: 'Tâche planifiée',
      status: 'open',
      dueAt: DateTime.now().plus({ days: 90 }),
      dueEngineHours: null,
    })

    const response = await client.get('/planning').loginAs(user).withInertia()

    response.assertStatus(200)
    const props = response.inertiaProps as {
      undatedTasks: { id: number }[]
      plannedTasks: { id: number }[]
    }

    assert.sameMembers(
      props.undatedTasks.map((t) => t.id),
      [undated.id]
    )
    assert.sameMembers(
      props.plannedTasks.map((t) => t.id),
      [planned.id]
    )
  })

  test('GET /planning does not mix undated tasks with overdue tasks', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const undated = await BoatMaintenanceTask.create({
      boatId: boat.id,
      subject: 'sail',
      title: 'Tâche sans échéance',
      status: 'open',
      dueAt: null,
      dueEngineHours: null,
    })

    const overdue = await BoatMaintenanceTask.create({
      boatId: boat.id,
      subject: 'sail',
      title: 'Tâche en retard',
      status: 'open',
      dueAt: DateTime.now().minus({ days: 5 }),
      dueEngineHours: null,
    })

    const response = await client.get('/planning').loginAs(user).withInertia()

    response.assertStatus(200)
    const props = response.inertiaProps as {
      undatedTasks: { id: number }[]
      overdueTasks: { id: number }[]
    }

    assert.sameMembers(
      props.undatedTasks.map((t) => t.id),
      [undated.id]
    )
    assert.sameMembers(
      props.overdueTasks.map((t) => t.id),
      [overdue.id]
    )
  })
})
