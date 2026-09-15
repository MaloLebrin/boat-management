import { test } from '@japa/runner'
import BoatMaintenanceTaskService, {
  BoatMaintenanceTaskNotFoundError,
  BoatMaintenanceTaskValidationError,
} from '#services/boat_maintenance_task_service'
import BoatMaintenanceTask from '#models/boat_maintenance_task'
import { DateTime } from 'luxon'
import { UserFactory } from '#database/factories/user_factory'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { BoatSailFactory } from '#database/factories/boat_sail_factory'
import { BoatRigFactory } from '#database/factories/boat_rig_factory'
import { BoatSafetyEquipmentFactory } from '#database/factories/boat_safety_equipment_factory'
import { BoatGenericEquipmentFactory } from '#database/factories/boat_generic_equipment_factory'
import type { EquipmentReferenceType } from '#shared/constants/equipment_action'
import { equipmentFieldName } from '#shared/helpers/maintenance_task_equipment'
import type Boat from '#models/boat'

async function makeUserBoat() {
  const user = await UserFactory.with('organization').create()
  const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
  return { user, boat }
}

const EQUIPMENT_FACTORIES = {
  engine: BoatEngineFactory,
  sail: BoatSailFactory,
  rig: BoatRigFactory,
  safety: BoatSafetyEquipmentFactory,
  generic: BoatGenericEquipmentFactory,
} as const

async function makeEquipment(type: EquipmentReferenceType, boat: Boat): Promise<number> {
  const equipment = await EQUIPMENT_FACTORIES[type].merge({ boatId: boat.id }).create()
  return equipment.id
}

test.group('BoatMaintenanceTaskService (unit)', () => {
  test('createForBoat accepts a task without any due', async ({ assert }) => {
    const { user, boat } = await makeUserBoat()

    const task = await new BoatMaintenanceTaskService().createForBoat(user, boat, {
      title: 'Buy a new fender',
    })

    assert.equal(task.subject, 'boat')
    assert.isNull(task.dueAt)
    assert.isNull(task.dueEngineHours)
  })

  test('createForBoat links safety equipment and derives the subject', async ({ assert }) => {
    const { user, boat } = await makeUserBoat()
    const safety = await BoatSafetyEquipmentFactory.merge({ boatId: boat.id }).create()

    const task = await new BoatMaintenanceTaskService().createForBoat(user, boat, {
      title: 'Check flares',
      boatSafetyEquipmentId: safety.id,
    })

    assert.equal(task.subject, 'safety')
    assert.equal(task.boatSafetyEquipmentId, safety.id)
  })

  test('createForBoat derives the subject from the generic equipment category', async ({
    assert,
  }) => {
    const { user, boat } = await makeUserBoat()
    const generic = await BoatGenericEquipmentFactory.merge({
      boatId: boat.id,
      category: 'energy',
    }).create()
    const svc = new BoatMaintenanceTaskService()

    const derived = await svc.createForBoat(user, boat, {
      title: 'Clean solar panel',
      boatGenericEquipmentId: generic.id,
    })
    const explicit = await svc.createForBoat(user, boat, {
      title: 'Seal panel',
      subject: 'deck',
      boatGenericEquipmentId: generic.id,
    })

    assert.equal(derived.subject, 'electrical')
    assert.equal(derived.boatGenericEquipmentId, generic.id)
    assert.equal(explicit.subject, 'deck')
  })

  for (const type of ['engine', 'sail', 'rig', 'safety', 'generic'] as const) {
    test(`createForBoat rejects ${type} equipment of another boat`, async ({ assert }) => {
      const { user, boat } = await makeUserBoat()
      const otherBoat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
      const foreignId = await makeEquipment(type, otherBoat)

      try {
        await new BoatMaintenanceTaskService().createForBoat(user, boat, {
          title: 'Foreign',
          [equipmentFieldName(type)]: foreignId,
        })
        assert.fail('expected a validation error')
      } catch (error) {
        assert.instanceOf(error, BoatMaintenanceTaskValidationError)
        assert.equal((error as BoatMaintenanceTaskValidationError).errorCode, 'equipmentNotFound')
      }
      assert.lengthOf(await BoatMaintenanceTask.query().where('boatId', boat.id), 0)
    })
  }

  test('createForBoat rejects several equipment and mismatching subjects', async ({ assert }) => {
    const { user, boat } = await makeUserBoat()
    const sail = await BoatSailFactory.merge({ boatId: boat.id }).create()
    const rig = await BoatRigFactory.merge({ boatId: boat.id }).create()
    const svc = new BoatMaintenanceTaskService()

    const codeOf = async (run: () => Promise<unknown>) => {
      try {
        await run()
        return null
      } catch (error) {
        return (error as BoatMaintenanceTaskValidationError).errorCode
      }
    }

    assert.equal(
      await codeOf(() =>
        svc.createForBoat(user, boat, { title: 'x', boatSailId: sail.id, boatRigId: rig.id })
      ),
      'multipleEquipment'
    )
    assert.equal(
      await codeOf(() =>
        svc.createForBoat(user, boat, { title: 'x', subject: 'engine', boatSailId: sail.id })
      ),
      'subjectEquipmentMismatch'
    )
  })

  test('markDone copies the equipment link and dates the next undated occurrence', async ({
    assert,
  }) => {
    const { user, boat } = await makeUserBoat()
    const generic = await BoatGenericEquipmentFactory.merge({ boatId: boat.id }).create()
    const svc = new BoatMaintenanceTaskService()
    const task = await svc.createForBoat(user, boat, {
      title: 'Grease windlass',
      boatGenericEquipmentId: generic.id,
      recurrenceIntervalMonths: 6,
    })

    const doneAt = DateTime.fromISO('2026-04-01')
    await svc.markDone(user, boat, task.id, { doneAt })

    const next = await BoatMaintenanceTask.query()
      .where('boatId', boat.id)
      .where('status', 'open')
      .firstOrFail()
    assert.equal(next.boatGenericEquipmentId, generic.id)
    assert.equal(next.dueAt?.toISODate(), '2026-10-01')
  })

  test('listForEquipment returns only that equipment, dated tasks first', async ({ assert }) => {
    const { user, boat } = await makeUserBoat()
    const safety = await BoatSafetyEquipmentFactory.merge({ boatId: boat.id }).create()
    const svc = new BoatMaintenanceTaskService()
    const undated = await svc.createForBoat(user, boat, {
      title: 'Undated',
      boatSafetyEquipmentId: safety.id,
    })
    const dated = await svc.createForBoat(user, boat, {
      title: 'Dated',
      boatSafetyEquipmentId: safety.id,
      dueAt: '2026-12-01',
    })
    await svc.createForBoat(user, boat, { title: 'Boat-wide' })

    const tasks = await svc.listForEquipment(boat.id, { type: 'safety', id: safety.id })

    assert.deepEqual(
      tasks.map((t) => t.id),
      [dated.id, undated.id]
    )
  })

  test('deleting the equipment keeps the task and clears the link', async ({ assert }) => {
    const { user, boat } = await makeUserBoat()
    const generic = await BoatGenericEquipmentFactory.merge({ boatId: boat.id }).create()
    const task = await new BoatMaintenanceTaskService().createForBoat(user, boat, {
      title: 'Service fridge',
      boatGenericEquipmentId: generic.id,
    })

    await generic.delete()
    await task.refresh()

    assert.isNull(task.boatGenericEquipmentId)
  })

  test('markDone creates next task by months recurrence', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const svc = new BoatMaintenanceTaskService()
    const task = await svc.createForBoat(user, boat, {
      subject: 'boat',
      title: 'Antifouling',
      dueAt: '2026-01-01',
      recurrenceIntervalMonths: 12,
    })

    const doneAt = DateTime.fromISO('2026-02-10')
    await svc.markDone(user, boat, task.id, { doneAt })

    const tasks = await BoatMaintenanceTask.query().where('boatId', boat.id).orderBy('id', 'asc')
    assert.equal(tasks.length, 2)
    assert.equal(tasks[0]!.status, 'done')
    assert.equal(tasks[1]!.status, 'open')
    assert.equal(tasks[1]!.dueAt?.toISODate(), doneAt.plus({ months: 12 }).toISODate())
  })

  test('markDone creates next task by engine-hours recurrence', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await BoatEngineFactory.merge({ boatId: boat.id, hours: 100 }).create()

    const svc = new BoatMaintenanceTaskService()
    const task = await svc.createForBoat(user, boat, {
      subject: 'engine',
      boatEngineId: engine.id,
      title: 'Oil change',
      dueEngineHours: 150,
      recurrenceIntervalEngineHours: 50,
    })

    await svc.markDone(user, boat, task.id, { doneAt: '2026-03-01', doneEngineHours: 155 })

    const tasks = await BoatMaintenanceTask.query().where('boatId', boat.id).orderBy('id', 'asc')
    assert.equal(tasks.length, 2)
    assert.equal(tasks[0]!.status, 'done')
    assert.equal(tasks[0]!.doneEngineHours, 155)
    assert.equal(tasks[1]!.status, 'open')
    assert.equal(tasks[1]!.dueEngineHours, 205)
    assert.equal(tasks[1]!.lastDoneEngineHours, 155)
  })

  test('cross-boat scope hides tasks', async ({ assert }) => {
    const userA = await UserFactory.with('organization').create()
    const userB = await UserFactory.with('organization').create()
    const boatA = await BoatFactory.merge({ organizationId: userA.organizationId! }).create()
    const boatB = await BoatFactory.merge({ organizationId: userB.organizationId! }).create()

    const svc = new BoatMaintenanceTaskService()
    const taskA = await svc.createForBoat(userA, boatA, {
      subject: 'boat',
      title: 'A',
      dueAt: '2026-01-01',
    })

    await assert.rejects(
      () => svc.markDone(userB, boatB, taskA.id, { doneAt: '2026-01-02' }),
      BoatMaintenanceTaskNotFoundError
    )
  })
})
