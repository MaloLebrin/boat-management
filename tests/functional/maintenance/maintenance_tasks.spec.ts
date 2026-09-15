import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import BoatMaintenanceTask from '#models/boat_maintenance_task'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatSailFactory } from '#database/factories/boat_sail_factory'
import { BoatRigFactory } from '#database/factories/boat_rig_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { BoatSafetyEquipmentFactory } from '#database/factories/boat_safety_equipment_factory'
import { BoatGenericEquipmentFactory } from '#database/factories/boat_generic_equipment_factory'
import { createAdminUser, createBoatOwnerUser, createMechanicUser } from '#tests/functional/helpers'

test.group('Maintenance tasks — quick add (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('a title alone creates an undated boat task and redirects back', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/maintenance-tasks`)
      .loginAs(admin)
      .header('referer', '/dashboard')
      .form({ title: 'Buy a new fender' })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/dashboard')
    const task = await BoatMaintenanceTask.query().where('boatId', boat.id).firstOrFail()
    assert.equal(task.subject, 'boat')
    assert.isNull(task.dueAt)
  })

  test('a task on a sail page links the sail and returns to that page', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const sail = await BoatSailFactory.merge({ boatId: boat.id }).create()
    const sailPage = `/boats/${boat.id}/sails/${sail.id}`

    const response = await client
      .post(`/boats/${boat.id}/maintenance-tasks`)
      .loginAs(admin)
      .header('referer', sailPage)
      .form({ title: 'Repair batten pocket', boatSailId: String(sail.id) })
      .redirects(0)

    response.assertHeader('location', sailPage)
    const task = await BoatMaintenanceTask.query().where('boatId', boat.id).firstOrFail()
    assert.equal(task.subject, 'sail')
    assert.equal(task.boatSailId, sail.id)
  })

  test('mechanic can add a task on generic and safety equipment', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const mechanic = await createMechanicUser(admin.organizationId!)
    const generic = await BoatGenericEquipmentFactory.merge({
      boatId: boat.id,
      category: 'plumbing',
    }).create()
    const safety = await BoatSafetyEquipmentFactory.merge({ boatId: boat.id }).create()

    await client
      .post(`/boats/${boat.id}/maintenance-tasks`)
      .loginAs(mechanic)
      .form({ title: 'Replace pump impeller', boatGenericEquipmentId: String(generic.id) })
    await client
      .post(`/boats/${boat.id}/maintenance-tasks`)
      .loginAs(mechanic)
      .form({ title: 'Service life raft', boatSafetyEquipmentId: String(safety.id) })

    const tasks = await BoatMaintenanceTask.query().where('boatId', boat.id).orderBy('id', 'asc')
    assert.lengthOf(tasks, 2)
    assert.equal(tasks[0]!.subject, 'plumbing')
    assert.equal(tasks[0]!.boatGenericEquipmentId, generic.id)
    assert.equal(tasks[1]!.subject, 'safety')
    assert.equal(tasks[1]!.boatSafetyEquipmentId, safety.id)
  })

  test('equipment of another organization is refused with a flash error', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const other = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const foreignBoat = await BoatFactory.merge({ organizationId: other.organizationId! }).create()
    const foreignSafety = await BoatSafetyEquipmentFactory.merge({
      boatId: foreignBoat.id,
    }).create()

    const response = await client
      .post(`/boats/${boat.id}/maintenance-tasks`)
      .loginAs(admin)
      .form({ title: 'Sneaky', boatSafetyEquipmentId: String(foreignSafety.id) })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', 'This equipment does not belong to the boat.')
    assert.lengthOf(await BoatMaintenanceTask.all(), 0)
  })

  test('an engine-hour due not above the engine counter is a field error', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const engine = await BoatEngineFactory.merge({ boatId: boat.id, hours: 400 }).create()
    const enginePage = `/boats/${boat.id}/engines/${engine.id}`

    const response = await client
      .post(`/boats/${boat.id}/maintenance-tasks`)
      .loginAs(admin)
      .header('referer', enginePage)
      .form({ title: 'Oil change', boatEngineId: String(engine.id), dueEngineHours: '400' })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', enginePage)
    const flash = response.flashMessages() as {
      inputErrorsBag?: { dueEngineHours?: string[] }
    }
    assert.deepEqual(flash.inputErrorsBag?.dueEngineHours, [
      "Must be greater than the engine's current hours (400 h).",
    ])
    assert.lengthOf(await BoatMaintenanceTask.all(), 0)

    await client
      .post(`/boats/${boat.id}/maintenance-tasks`)
      .loginAs(admin)
      .form({ title: 'Oil change', boatEngineId: String(engine.id), dueEngineHours: '401' })
    const task = await BoatMaintenanceTask.query().where('boatId', boat.id).firstOrFail()
    assert.equal(task.dueEngineHours, 401)
  })

  test('mark done and delete redirect back to the page of origin', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const safety = await BoatSafetyEquipmentFactory.merge({ boatId: boat.id }).create()
    const page = `/boats/${boat.id}/safety-equipment/${safety.id}`
    const task = await BoatMaintenanceTask.create({
      boatId: boat.id,
      subject: 'safety',
      boatSafetyEquipmentId: safety.id,
      title: 'Check flares',
      status: 'open',
    })

    const done = await client
      .put(`/boats/${boat.id}/maintenance-tasks/${task.id}/done`)
      .loginAs(admin)
      .header('referer', page)
      .form({})
      .redirects(0)
    done.assertHeader('location', page)
    await task.refresh()
    assert.equal(task.status, 'done')

    const removed = await client
      .delete(`/boats/${boat.id}/maintenance-tasks/${task.id}`)
      .loginAs(admin)
      .header('referer', page)
      .redirects(0)
    removed.assertHeader('location', page)
    assert.isNull(await BoatMaintenanceTask.find(task.id))
  })

  test('a user without maintenance.create cannot add a task', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const owner = await createBoatOwnerUser(admin.organizationId!)

    await client
      .post(`/boats/${boat.id}/maintenance-tasks`)
      .loginAs(owner)
      .form({ title: 'Not allowed' })
      .redirects(0)

    assert.lengthOf(await BoatMaintenanceTask.all(), 0)
  })
})

test.group('Maintenance tasks — equipment detail pages (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('sail, rig, safety and generic pages expose their own tasks and permissions', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const sail = await BoatSailFactory.merge({ boatId: boat.id }).create()
    const rig = await BoatRigFactory.merge({ boatId: boat.id }).create()
    const safety = await BoatSafetyEquipmentFactory.merge({ boatId: boat.id }).create()
    const generic = await BoatGenericEquipmentFactory.merge({ boatId: boat.id }).create()

    const make = (title: string, columns: Partial<BoatMaintenanceTask>) =>
      BoatMaintenanceTask.create({
        boatId: boat.id,
        subject: 'boat',
        status: 'open',
        title,
        ...columns,
      })
    await make('Sail task', { subject: 'sail', boatSailId: sail.id })
    await make('Rig task', { subject: 'rig', boatRigId: rig.id })
    await make('Safety task', { subject: 'safety', boatSafetyEquipmentId: safety.id })
    await make('Generic task', { boatGenericEquipmentId: generic.id })
    await make('Boat task', {})

    const pages = [
      { url: `/boats/${boat.id}/sails/${sail.id}`, title: 'Sail task', key: 'sails', id: sail.id },
      { url: `/boats/${boat.id}/rig`, title: 'Rig task', key: 'rig', id: rig.id },
      {
        url: `/boats/${boat.id}/safety-equipment/${safety.id}`,
        title: 'Safety task',
        key: 'safetyEquipment',
        id: safety.id,
      },
      {
        url: `/boats/${boat.id}/generic-equipment/${generic.id}`,
        title: 'Generic task',
        key: 'genericEquipment',
        id: generic.id,
      },
    ]

    for (const page of pages) {
      const response = await client.get(page.url).loginAs(admin).withInertia()
      response.assertStatus(200)
      const props = response.inertiaProps as {
        maintenanceTasks: { title: string }[]
        taskEquipment: Record<string, unknown>
        taskPermissions: { canCreate: boolean; canEdit: boolean; canDelete: boolean }
      }
      assert.deepEqual(
        props.maintenanceTasks.map((t) => t.title),
        [page.title],
        page.url
      )
      assert.deepEqual(props.taskPermissions, { canCreate: true, canEdit: true, canDelete: true })
      const source = props.taskEquipment[page.key]
      const ids = Array.isArray(source)
        ? source.map((s: { id: number }) => s.id)
        : [(source as { id: number }).id]
      assert.deepEqual(ids, [page.id], page.url)
    }
  })

  test('the engine page lists its tasks with the shared row shape', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const engine = await BoatEngineFactory.merge({ boatId: boat.id }).create()
    await BoatMaintenanceTask.create({
      boatId: boat.id,
      subject: 'engine',
      boatEngineId: engine.id,
      status: 'open',
      title: 'Impeller',
    })

    const response = await client
      .get(`/boats/${boat.id}/engines/${engine.id}`)
      .loginAs(admin)
      .withInertia()

    const props = response.inertiaProps as {
      maintenanceTasks: Array<{ title: string; boatSafetyEquipmentId: number | null }>
      taskEquipment: { engines: { id: number }[] }
      taskPermissions: { canCreate: boolean }
    }
    assert.equal(props.maintenanceTasks[0]!.title, 'Impeller')
    assert.property(props.maintenanceTasks[0], 'boatSafetyEquipmentId')
    assert.deepEqual(
      props.taskEquipment.engines.map((e) => e.id),
      [engine.id]
    )
    assert.isTrue(props.taskPermissions.canCreate)
  })

  test('a mechanic can create tasks but not delete them on an equipment page', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const sail = await BoatSailFactory.merge({ boatId: boat.id }).create()
    const mechanic = await createMechanicUser(admin.organizationId!)

    const response = await client
      .get(`/boats/${boat.id}/sails/${sail.id}`)
      .loginAs(mechanic)
      .withInertia()

    const { taskPermissions } = response.inertiaProps as {
      taskPermissions: { canCreate: boolean; canEdit: boolean; canDelete: boolean }
    }
    assert.deepEqual(taskPermissions, { canCreate: true, canEdit: true, canDelete: false })
  })
})
