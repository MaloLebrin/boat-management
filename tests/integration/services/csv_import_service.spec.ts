import { test } from '@japa/runner'
import { importMaintenanceRows } from '#services/csv_import_service'
import type { MaintenanceImportRow } from '#shared/types/csv'
import BoatMaintenanceEvent from '#models/boat_maintenance_event'
import { BoatFactory } from '#database/factories/boat_factory'
import { UserFactory } from '#database/factories/user_factory'
import i18nManager from '@adonisjs/i18n/services/main'

const ROW: MaintenanceImportRow = {
  performedAt: '2024-01-15',
  title: 'Vidange moteur',
  subject: 'engine',
  notes: null,
  engineCaption: 'Moteur bâbord',
  sailCaption: null,
  cost: 150,
}

test.group('importMaintenanceRows (integration)', () => {
  test('nomme la pièce de coût selon la locale française', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    await importMaintenanceRows(boat.id, [ROW], i18nManager.locale('fr'))

    const event = await BoatMaintenanceEvent.query().where('boatId', boat.id).firstOrFail()
    await event.load('parts')

    assert.equal(event.parts[0]!.name, 'Coût total')
  })

  test('nomme la pièce de coût selon la locale anglaise', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    await importMaintenanceRows(boat.id, [ROW], i18nManager.locale('en'))

    const event = await BoatMaintenanceEvent.query().where('boatId', boat.id).firstOrFail()
    await event.load('parts')

    assert.equal(event.parts[0]!.name, 'Total cost')
  })
})
