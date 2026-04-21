import { test } from '@japa/runner'
import DashboardService from '#services/dashboard_service'
import BoatMaintenanceEvent from '#models/boat_maintenance_event'
import Organization from '#models/organization'
import User from '#models/user'
import Boat from '#models/boat'
import { DateTime } from 'luxon'

test.group('DashboardService (unit)', (group) => {
  group.each.teardown(async () => {
    await BoatMaintenanceEvent.query().delete()
    await Boat.query().delete()
    await User.query().delete()
    await Organization.query().delete()
  })

  test('urgent maintenance includes overdue and due-soon by dueAt', async ({ assert }) => {
    const org = await Organization.create({ name: 'O', slug: 'o-dash-1' })
    const user = await User.create({
      email: 'dash@example.com',
      password: 'Password123!',
      fullName: 'Dash',
      organizationId: org.id,
    })
    const boat = await Boat.create({
      organizationId: org.id,
      name: 'B',
      registrationNumber: null,
      type: null,
    })

    const today = DateTime.now().startOf('day')

    await BoatMaintenanceEvent.create({
      boatId: boat.id,
      subject: 'boat',
      performedAt: today.minus({ days: 30 }),
      dueAt: today.minus({ days: 1 }),
      title: 'Overdue',
      notes: null,
      engineCaption: null,
      sailCaption: null,
      boatEngineId: null,
      boatSailId: null,
      boatRigId: null,
    })

    await BoatMaintenanceEvent.create({
      boatId: boat.id,
      subject: 'boat',
      performedAt: today.minus({ days: 10 }),
      dueAt: today.plus({ days: 3 }),
      title: 'Soon',
      notes: null,
      engineCaption: null,
      sailCaption: null,
      boatEngineId: null,
      boatSailId: null,
      boatRigId: null,
    })

    await BoatMaintenanceEvent.create({
      boatId: boat.id,
      subject: 'boat',
      performedAt: today.minus({ days: 10 }),
      dueAt: today.plus({ days: 40 }),
      title: 'Later',
      notes: null,
      engineCaption: null,
      sailCaption: null,
      boatEngineId: null,
      boatSailId: null,
      boatRigId: null,
    })

    const svc = new DashboardService()
    const data = await svc.getForUser(user, { urgentWithinDays: 14, urgentLimit: 10 })

    assert.equal(data.urgentMaintenance.length, 2)
    assert.equal(data.urgentMaintenance[0]!.title, 'Overdue')
    assert.equal(data.urgentMaintenance[1]!.title, 'Soon')
  })
})
