import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { BoatFactory } from '#database/factories/boat_factory'
import { createAdminUser, createMechanicUser, createMemberUser } from '#tests/functional/helpers'
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

test.group('Planning index — accès mécanicien (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('GET /planning est accessible au mécanicien mais /boats/:id lui répond 403 (#473)', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const mechanic = await createMechanicUser(admin.organizationId!)
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()

    await BoatMaintenanceTask.create({
      boatId: boat.id,
      subject: 'engine',
      title: 'Vidange',
      status: 'open',
      dueAt: DateTime.now().plus({ days: 3 }),
      dueEngineHours: null,
    })

    const planning = await client.get('/planning').loginAs(mechanic).withInertia()
    planning.assertStatus(200)

    const props = planning.inertiaProps as {
      permissions: { role: string; capabilities: string[] }
      soonTasks: { boatId: number }[]
    }

    // Le planning montre bien des tâches rattachées à un bateau…
    assert.isAbove(props.soonTasks.length, 0)
    // …mais le mécanicien n'a pas `boats.view` : l'UI doit masquer les liens vers
    // la fiche bateau, sans quoi la carte pointe vers un 403.
    assert.equal(props.permissions.role, 'mechanic')
    assert.notInclude(props.permissions.capabilities, 'boats.view')

    const boatShow = await client.get(`/boats/${boat.id}`).loginAs(mechanic).withInertia()
    boatShow.assertStatus(403)
  })

  test('GET /planning laisse `boats.view` au membre, qui garde le lien vers la fiche bateau (#473)', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const member = await createMemberUser(admin.organizationId!)
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()

    const response = await client.get('/planning').loginAs(member).withInertia()

    response.assertStatus(200)
    const props = response.inertiaProps as {
      permissions: { role: string; capabilities: string[] }
    }
    assert.include(props.permissions.capabilities, 'boats.view')

    const boatShow = await client.get(`/boats/${boat.id}`).loginAs(member).withInertia()
    boatShow.assertStatus(200)
  })
})
