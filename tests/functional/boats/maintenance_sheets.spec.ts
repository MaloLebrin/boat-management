import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import BoatMaintenanceSheet from '#models/boat_maintenance_sheet'
import BoatMaintenanceSheetItem from '#models/boat_maintenance_sheet_item'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatMaintenanceSheetFactory } from '#database/factories/boat_maintenance_sheet_factory'
import { createAdminUser } from '#tests/functional/helpers'

async function makeSheet(boatId: number) {
  return BoatMaintenanceSheetFactory.merge({
    boatId,
    status: 'in_progress',
    type: 'entretien',
  }).create()
}

function addItem(sheetId: number, position: number, isDone: boolean) {
  return BoatMaintenanceSheetItem.create({
    boatMaintenanceSheetId: sheetId,
    label: `Item ${position}`,
    position,
    isDone,
  })
}

test.group('Maintenance sheet completion (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('PUT complete is rejected when an item is not done (#185)', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const sheet = await makeSheet(boat.id)
    await addItem(sheet.id, 1, true)
    await addItem(sheet.id, 2, false)

    const response = await client
      .put(`/boats/${boat.id}/maintenance-sheets/${sheet.id}/complete`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage(
      'error',
      'All items must be checked off before completing the sheet.'
    )

    const refreshed = await BoatMaintenanceSheet.findOrFail(sheet.id)
    assert.equal(refreshed.status, 'in_progress')
  })

  test('PUT complete succeeds when every item is done (#185)', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const sheet = await makeSheet(boat.id)
    await addItem(sheet.id, 1, true)
    await addItem(sheet.id, 2, true)

    const response = await client
      .put(`/boats/${boat.id}/maintenance-sheets/${sheet.id}/complete`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)

    const refreshed = await BoatMaintenanceSheet.findOrFail(sheet.id)
    assert.equal(refreshed.status, 'completed')
  })

  test('PUT complete succeeds on a sheet without items (#185)', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const sheet = await makeSheet(boat.id)

    const response = await client
      .put(`/boats/${boat.id}/maintenance-sheets/${sheet.id}/complete`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)

    const refreshed = await BoatMaintenanceSheet.findOrFail(sheet.id)
    assert.equal(refreshed.status, 'completed')
  })
})
