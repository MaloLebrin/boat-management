import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import BoatMaintenanceTask from '#models/boat_maintenance_task'
import BoatReservation from '#models/boat_reservation'
import { BoatFactory } from '#database/factories/boat_factory'
import {
  createAdminUser,
  createCharterAdminUser,
  createMechanicUser,
} from '#tests/functional/helpers'
import { DateTime } from 'luxon'
import type { PlanningReservation } from '#shared/types/planning'
import type { FleetBoatCalendarEntry } from '#shared/types/reservation'

/**
 * Glisser-déposer du planning et superposition des réservations (#869).
 *
 * - `/planning` reçoit les réservations `option`/`confirmed` de la flotte,
 *   seulement si le module Location est actif et que l'utilisateur voit les
 *   bateaux (un mécanicien n'a pas `boats.view`) ;
 * - `/reservations` reçoit, par bateau, les entretiens planifiés (tâches
 *   ouvertes datées) en plages de jours ;
 * - le dépôt d'une carte passe par la route d'update existante.
 */

function inDays(days: number, hour = 10): DateTime {
  return DateTime.now().startOf('day').plus({ days, hours: hour })
}

async function reservation(
  boatId: number,
  organizationId: number,
  status: 'option' | 'confirmed' | 'cancelled',
  fromDays: number,
  toDays: number,
  clientName = 'Durand'
) {
  return BoatReservation.create({
    boatId,
    organizationId,
    status,
    startsAt: inDays(fromDays),
    endsAt: inDays(toDays),
    clientName,
  })
}

test.group('Planning — réservations superposées (#869)', (group) => {
  group.each.setup(() => truncateDb())

  test('module Location actif : options et confirmées de la fenêtre, sans les annulées', async ({
    client,
    assert,
  }) => {
    const user = await createCharterAdminUser()
    const orgId = user.organizationId!
    const boat = await BoatFactory.merge({ organizationId: orgId, name: 'Mistral' }).create()
    const confirmed = await reservation(boat.id, orgId, 'confirmed', 3, 6, 'Alice')
    const option = await reservation(boat.id, orgId, 'option', 10, 12)
    await reservation(boat.id, orgId, 'cancelled', 20, 22)
    // Terminée bien avant la fenêtre : inutile au calendrier.
    await reservation(boat.id, orgId, 'confirmed', -90, -80)

    const other = await createCharterAdminUser()
    const foreignBoat = await BoatFactory.merge({ organizationId: other.organizationId! }).create()
    await reservation(foreignBoat.id, other.organizationId!, 'confirmed', 3, 6)

    const response = await client.get('/planning').loginAs(user).withInertia()
    response.assertStatus(200)
    const { reservations } = response.inertiaProps as { reservations: PlanningReservation[] }

    assert.deepEqual(
      reservations.map((r) => r.id),
      [confirmed.id, option.id]
    )
    assert.equal(reservations[0].boatName, 'Mistral')
    assert.equal(reservations[0].clientName, 'Alice')
    assert.equal(reservations[0].status, 'confirmed')
    assert.equal(Date.parse(reservations[0].startsAt), confirmed.startsAt.toMillis())
  })

  test('sans module Location, aucune réservation', async ({ client, assert }) => {
    const user = await createAdminUser('pro')
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    await reservation(boat.id, user.organizationId!, 'confirmed', 3, 6)

    const response = await client.get('/planning').loginAs(user).withInertia()
    response.assertStatus(200)
    assert.deepEqual((response.inertiaProps as { reservations: unknown[] }).reservations, [])
  })

  test('un mécanicien (sans boats.view) ne reçoit pas les réservations', async ({
    client,
    assert,
  }) => {
    const admin = await createCharterAdminUser()
    const mechanic = await createMechanicUser(admin.organizationId!)
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    await reservation(boat.id, admin.organizationId!, 'confirmed', 3, 6)

    const response = await client.get('/planning').loginAs(mechanic).withInertia()
    response.assertStatus(200)
    assert.deepEqual((response.inertiaProps as { reservations: unknown[] }).reservations, [])
  })

  test('déposer une carte : PATCH de l’échéance, puis retour au planning', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser('pro')
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const task = await BoatMaintenanceTask.create({
      boatId: boat.id,
      subject: 'hull',
      title: 'Carénage',
      status: 'open',
      dueAt: DateTime.fromISO(inDays(5).toISODate()!),
      dueEngineHours: null,
    })
    const target = inDays(45).toISODate()!

    const response = await client
      .patch(`/boats/${boat.id}/maintenance-tasks/${task.id}`)
      .header('referer', '/planning')
      .json({ dueAt: target })
      .loginAs(user)
      .redirects(0)
    response.assertStatus(302)
    response.assertHeader('location', '/planning')

    await task.refresh()
    assert.equal(task.dueAt?.toISODate(), target)

    const planning = await client.get('/planning').loginAs(user).withInertia()
    const props = planning.inertiaProps as { plannedTasks: { id: number }[] }
    assert.deepEqual(
      props.plannedTasks.map((t) => t.id),
      [task.id]
    )

    // Colonne « Non datées » : l'échéance est retirée.
    await client
      .patch(`/boats/${boat.id}/maintenance-tasks/${task.id}`)
      .json({ dueAt: null })
      .loginAs(user)
      .redirects(0)
    await task.refresh()
    assert.isNull(task.dueAt)
  })
})

test.group('Réservations — couche entretien planifié (#869)', (group) => {
  group.each.setup(() => truncateDb())

  test('chaque bateau porte ses tâches ouvertes datées, en plages de jours', async ({
    client,
    assert,
  }) => {
    const user = await createCharterAdminUser()
    const orgId = user.organizationId!
    const boat = await BoatFactory.merge({ organizationId: orgId }).create()
    const idle = await BoatFactory.merge({ organizationId: orgId }).create()
    const due = inDays(7).toISODate()!

    const scheduled = await BoatMaintenanceTask.create({
      boatId: boat.id,
      subject: 'hull',
      title: 'Carénage',
      status: 'open',
      dueAt: DateTime.fromISO(due),
      dueEngineHours: null,
      estimatedDurationMinutes: 36 * 60,
    })
    await BoatMaintenanceTask.create({
      boatId: boat.id,
      subject: 'engine',
      title: 'Déjà faite',
      status: 'done',
      dueAt: DateTime.fromISO(due),
      dueEngineHours: null,
    })
    await BoatMaintenanceTask.create({
      boatId: boat.id,
      subject: 'engine',
      title: 'Sans date',
      status: 'open',
      dueAt: null,
      dueEngineHours: null,
    })

    const response = await client.get('/reservations').loginAs(user).withInertia()
    response.assertStatus(200)
    const { calendarEntries } = response.inertiaProps as {
      calendarEntries: FleetBoatCalendarEntry[]
    }

    const entry = calendarEntries.find((e) => e.boatId === boat.id)!
    assert.deepEqual(entry.maintenance, [
      {
        taskId: scheduled.id,
        title: 'Carénage',
        startsOn: due,
        endsOn: DateTime.fromISO(due).plus({ days: 2 }).toISODate()!,
      },
    ])
    assert.deepEqual(calendarEntries.find((e) => e.boatId === idle.id)!.maintenance, [])
  })
})
