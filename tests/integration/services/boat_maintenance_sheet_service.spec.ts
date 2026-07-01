import { test } from '@japa/runner'
import BoatMaintenanceSheetService, {
  BoatMaintenanceSheetNotFoundError,
  BoatMaintenanceSheetValidationError,
} from '#services/boat_maintenance_sheet_service'
import BoatMaintenanceSheet from '#models/boat_maintenance_sheet'
import BoatMaintenanceSheetItem from '#models/boat_maintenance_sheet_item'
import { UserFactory } from '#database/factories/user_factory'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatMaintenanceSheetFactory } from '#database/factories/boat_maintenance_sheet_factory'

test.group('BoatMaintenanceSheetService.updateItem', () => {
  test('throws BoatMaintenanceSheetValidationError when sheet is completed', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const sheet = await BoatMaintenanceSheetFactory.merge({
      boatId: boat.id,
      status: 'completed',
      type: 'entretien',
    }).create()
    const item = await BoatMaintenanceSheetItem.create({
      boatMaintenanceSheetId: sheet.id,
      label: 'Check engine',
      isDone: false,
      position: 1,
      notes: null,
    })

    const svc = new BoatMaintenanceSheetService()
    let caught: unknown
    try {
      await svc.updateItem(user, boat, sheet.id, item.id, { isDone: true, notes: null })
    } catch (err) {
      caught = err
    }

    assert.instanceOf(caught, BoatMaintenanceSheetValidationError)
    assert.equal((caught as BoatMaintenanceSheetValidationError).errorCode, 'sheetAlreadyCompleted')
  })

  test('updates item when sheet is not completed', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const sheet = await BoatMaintenanceSheetFactory.merge({
      boatId: boat.id,
      status: 'in_progress',
      type: 'entretien',
    }).create()
    const item = await BoatMaintenanceSheetItem.create({
      boatMaintenanceSheetId: sheet.id,
      label: 'Check bilge',
      isDone: false,
      position: 1,
      notes: null,
    })

    const svc = new BoatMaintenanceSheetService()
    await svc.updateItem(user, boat, sheet.id, item.id, { isDone: true, notes: 'Done ok' })

    const updated = await BoatMaintenanceSheetItem.findOrFail(item.id)
    assert.isTrue(updated.isDone)
    assert.equal(updated.notes, 'Done ok')
  })

  test('throws BoatMaintenanceSheetNotFoundError for unknown sheet', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const svc = new BoatMaintenanceSheetService()
    await assert.rejects(
      () => svc.updateItem(user, boat, 999999, 1, { isDone: false, notes: null }),
      BoatMaintenanceSheetNotFoundError
    )
  })
})
