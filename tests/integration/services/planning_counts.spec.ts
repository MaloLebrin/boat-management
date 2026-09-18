import { test } from '@japa/runner'
import PlanningService from '#services/planning_service'
import BoatMaintenanceTask from '#models/boat_maintenance_task'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { OrganizationFactory } from '#database/factories/organization_factory'
import { UserFactory } from '#database/factories/user_factory'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'

/**
 * `PlanningService.countDueTasksForOrg` (#693).
 *
 * L'issue la décrit comme « le comptage qui alimente le badge de navigation ».
 * **Il n'existe aucun badge** : son unique appelant est
 * `AssistantStarterService`, qui en tire les suggestions de démarrage du
 * copilote (« vous avez N tâches en retard »), servies dans une prop Inertia
 * `optional()`. C'est donc ça qu'on fige — ce que la fonction fait, pas ce que
 * l'issue croyait.
 *
 * Elle duplique le classement de `getPlanningForOrg` en s'appuyant sur les
 * **mêmes** prédicats privés : deux chemins, une seule règle. Les cas
 * ci-dessous portent sur les bornes, pour que la duplication ne puisse pas
 * diverger en silence.
 *
 * ⚠️ La suite `integration` ouvre **une** transaction pour tout le fichier, pas
 * une par test : chaque cas crée donc sa propre organisation, sinon les tâches
 * d'un test seraient comptées par le suivant.
 */

async function orgWithUser() {
  const user = await UserFactory.with('organization', 1).create()
  await user.load('organization')
  return user
}

function dueIn(days: number): DateTime {
  return DateTime.fromISO(DateTime.now().plus({ days }).toISODate()!)
}

async function counts(user: Awaited<ReturnType<typeof orgWithUser>>) {
  const service = await app.container.make(PlanningService)
  return service.countDueTasksForOrg(user)
}

test.group('PlanningService.countDueTasksForOrg', () => {
  test('compte séparément les tâches en retard et les tâches bientôt dues', async ({ assert }) => {
    const user = await orgWithUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    for (const offset of [-10, -1]) {
      await BoatMaintenanceTask.create({
        boatId: boat.id,
        subject: 'hull',
        title: `Retard ${offset}`,
        status: 'open',
        dueAt: dueIn(offset),
        dueEngineHours: null,
      })
    }
    await BoatMaintenanceTask.create({
      boatId: boat.id,
      subject: 'hull',
      title: 'Bientôt due',
      status: 'open',
      dueAt: dueIn(5),
      dueEngineHours: null,
    })

    assert.deepEqual(await counts(user), { overdue: 2, soon: 1 })
  })

  test('applique la même borne de 30 jours que le planning', async ({ assert }) => {
    const user = await orgWithUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    await BoatMaintenanceTask.create({
      boatId: boat.id,
      subject: 'hull',
      title: 'Sur la borne',
      status: 'open',
      dueAt: dueIn(30),
      dueEngineHours: null,
    })
    await BoatMaintenanceTask.create({
      boatId: boat.id,
      subject: 'hull',
      title: 'Juste au-delà',
      status: 'open',
      dueAt: dueIn(31),
      dueEngineHours: null,
    })

    // J+30 compte, J+31 non — et le second n'est compté nulle part : la
    // fonction ignore « planifié », par construction.
    assert.deepEqual(await counts(user), { overdue: 0, soon: 1 })
  })

  test('applique la même borne de 50 heures moteur', async ({ assert }) => {
    const user = await orgWithUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await BoatEngineFactory.merge({ boatId: boat.id, hours: 100 }).create()

    for (const [label, dueEngineHours] of [
      ['atteinte', 100],
      ['à 50 heures', 150],
      ['à 51 heures', 151],
    ] as const) {
      await BoatMaintenanceTask.create({
        boatId: boat.id,
        boatEngineId: engine.id,
        subject: 'engine',
        title: `Révision ${label}`,
        status: 'open',
        dueAt: null,
        dueEngineHours,
      })
    }

    assert.deepEqual(await counts(user), { overdue: 1, soon: 1 })
  })

  test('ne compte ni les tâches sans échéance, ni les tâches terminées', async ({ assert }) => {
    const user = await orgWithUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    await BoatMaintenanceTask.create({
      boatId: boat.id,
      subject: 'hull',
      title: 'Sans échéance',
      status: 'open',
      dueAt: null,
      dueEngineHours: null,
    })
    await BoatMaintenanceTask.create({
      boatId: boat.id,
      subject: 'hull',
      title: 'Terminée bien qu’en retard',
      status: 'done',
      dueAt: dueIn(-20),
      doneAt: DateTime.now(),
      dueEngineHours: null,
    })

    assert.deepEqual(await counts(user), { overdue: 0, soon: 0 })
  })

  test("ne compte pas les tâches d'une autre organisation", async ({ assert }) => {
    const user = await orgWithUser()
    await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const otherOrg = await OrganizationFactory.create()
    const otherBoat = await BoatFactory.merge({ organizationId: otherOrg.id }).create()
    await BoatMaintenanceTask.create({
      boatId: otherBoat.id,
      subject: 'hull',
      title: 'Retard chez le voisin',
      status: 'open',
      dueAt: dueIn(-3),
      dueEngineHours: null,
    })

    assert.deepEqual(await counts(user), { overdue: 0, soon: 0 })
  })

  test('renvoie zéro pour une organisation sans bateau', async ({ assert }) => {
    const user = await orgWithUser()

    assert.deepEqual(await counts(user), { overdue: 0, soon: 0 })
  })
})
