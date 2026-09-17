import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { BoatFactory } from '#database/factories/boat_factory'
import { OrganizationFactory } from '#database/factories/organization_factory'
import { UserFactory } from '#database/factories/user_factory'
import BoatReservationService from '#services/boat_reservation_service'
import BoatIncidentService from '#services/boat_incident_service'
import BoatEquipmentActionService from '#services/boat_equipment_action_service'
import BoatMaintenanceSheetService from '#services/boat_maintenance_sheet_service'
import BoatMaintenanceTaskService from '#services/boat_maintenance_task_service'
import BoatMaintenanceService from '#services/boat_maintenance_service'
import { ReservationNotFoundError } from '#exceptions/reservation_errors'
import { BoatIncidentNotFoundError } from '#exceptions/incident_errors'
import { BoatEquipmentActionNotFoundError } from '#exceptions/equipment_action_errors'
import {
  BoatMaintenanceNotFoundError,
  BoatMaintenanceSheetNotFoundError,
  BoatMaintenanceTaskNotFoundError,
  BoatMaintenanceValidationError,
} from '#exceptions/maintenance_errors'

/**
 * Caractérisation du périmètre d'organisation (vague 1.5) : chaque service
 * bateau traite un bateau étranger comme inexistant, avec l'erreur
 * « introuvable » de sa propre ressource — celle que le handler global sait
 * traduire. Ces cas figent le contrat avant que la garde soit mutualisée.
 */
async function foreignBoat() {
  const org = await OrganizationFactory.create()
  const otherOrg = await OrganizationFactory.create()
  const user = await UserFactory.merge({ organizationId: org.id }).create()
  const boat = await BoatFactory.merge({ organizationId: otherOrg.id }).create()
  return { user, boat }
}

test.group('Boat services — organization scope (integration)', () => {
  test('reservations: a foreign boat raises ReservationNotFoundError', async ({ assert }) => {
    const { user, boat } = await foreignBoat()
    const service = await app.container.make(BoatReservationService)

    await assert.rejects(() => service.listForBoat(user, boat), ReservationNotFoundError)
  })

  test('incidents: a foreign boat raises BoatIncidentNotFoundError', async ({ assert }) => {
    const { user, boat } = await foreignBoat()
    const service = await app.container.make(BoatIncidentService)

    await assert.rejects(() => service.listForBoat(user, boat), BoatIncidentNotFoundError)
  })

  test('equipment actions: a foreign boat raises BoatEquipmentActionNotFoundError', async ({
    assert,
  }) => {
    const { user, boat } = await foreignBoat()
    const service = await app.container.make(BoatEquipmentActionService)

    await assert.rejects(() => service.listForBoat(user, boat), BoatEquipmentActionNotFoundError)
  })

  test('maintenance sheets: a foreign boat raises BoatMaintenanceSheetNotFoundError', async ({
    assert,
  }) => {
    const { user, boat } = await foreignBoat()
    const service = await app.container.make(BoatMaintenanceSheetService)

    await assert.rejects(() => service.listForBoat(user, boat), BoatMaintenanceSheetNotFoundError)
  })

  test('maintenance tasks: a foreign boat raises BoatMaintenanceTaskNotFoundError', async ({
    assert,
  }) => {
    const { user, boat } = await foreignBoat()
    const service = await app.container.make(BoatMaintenanceTaskService)

    await assert.rejects(() => service.listForBoat(user, boat), BoatMaintenanceTaskNotFoundError)
  })

  test('maintenance events: creating on a foreign boat is an "invalidBoat" validation error', async ({
    assert,
  }) => {
    const { user, boat } = await foreignBoat()
    const service = await app.container.make(BoatMaintenanceService)

    await assert.rejects(
      () =>
        service.createForBoat(user, boat, {
          subjectType: 'boat',
          performedAt: '2026-07-01',
        } as never),
      BoatMaintenanceValidationError
    )
  })

  test('maintenance events: deleting on a foreign boat raises BoatMaintenanceNotFoundError', async ({
    assert,
  }) => {
    const { user, boat } = await foreignBoat()
    const service = await app.container.make(BoatMaintenanceService)

    await assert.rejects(() => service.deleteForBoat(user, boat, 1), BoatMaintenanceNotFoundError)
  })

  test('a user without organization is rejected the same way', async ({ assert }) => {
    const org = await OrganizationFactory.create()
    const user = await UserFactory.merge({ organizationId: null }).create()
    const boat = await BoatFactory.merge({ organizationId: org.id }).create()
    const service = await app.container.make(BoatIncidentService)

    await assert.rejects(() => service.listForBoat(user, boat), BoatIncidentNotFoundError)
  })
})
