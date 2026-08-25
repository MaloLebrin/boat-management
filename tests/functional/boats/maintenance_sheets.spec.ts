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

test.group('Maintenance sheet item conflict detection (#490)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('PUT item with a stale _expectedUpdatedAt is rejected with conflictData', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const sheet = await makeSheet(boat.id)
    const item = await addItem(sheet.id, 1, false)
    await item.refresh()

    // Une modification intercalée déplace updatedAt : le rejeu doit être refusé
    const staleUpdatedAt = item.updatedAt!.minus({ minutes: 5 }).toISO()!

    const response = await client
      .put(`/boats/${boat.id}/maintenance-sheets/${sheet.id}/items/${item.id}`)
      .loginAs(user)
      .redirects(0)
      .header('referer', `/boats/${boat.id}?tab=sheets`)
      .form({ isDone: true, notes: 'rejeu hors-ligne', _expectedUpdatedAt: staleUpdatedAt })

    response.assertStatus(302)
    response.assertFlashMessage('conflictType', 'update-sheet-item')
    response.assertFlashMessage('conflictData')

    // L'item n'a pas été écrasé
    const refreshed = await BoatMaintenanceSheetItem.findOrFail(item.id)
    assert.equal(refreshed.isDone, false)
    assert.isNull(refreshed.notes)
  })

  test('PUT item with the current _expectedUpdatedAt succeeds', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const sheet = await makeSheet(boat.id)
    const item = await addItem(sheet.id, 1, false)
    await item.refresh()

    const response = await client
      .put(`/boats/${boat.id}/maintenance-sheets/${sheet.id}/items/${item.id}`)
      .loginAs(user)
      .redirects(0)
      .form({ isDone: true, notes: 'ok', _expectedUpdatedAt: item.updatedAt!.toISO()! })

    response.assertStatus(302)

    const refreshed = await BoatMaintenanceSheetItem.findOrFail(item.id)
    assert.equal(refreshed.isDone, true)
    assert.equal(refreshed.notes, 'ok')
  })

  test('PUT item without _expectedUpdatedAt keeps the direct-edit behavior', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const sheet = await makeSheet(boat.id)
    const item = await addItem(sheet.id, 1, false)

    const response = await client
      .put(`/boats/${boat.id}/maintenance-sheets/${sheet.id}/items/${item.id}`)
      .loginAs(user)
      .redirects(0)
      .form({ isDone: true, notes: 'édition en ligne' })

    response.assertStatus(302)

    const refreshed = await BoatMaintenanceSheetItem.findOrFail(item.id)
    assert.equal(refreshed.isDone, true)
  })
})
