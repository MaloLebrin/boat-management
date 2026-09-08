import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import app from '@adonisjs/core/services/app'
import AssistantStarterService from '#services/assistant_starter_service'
import BoatMaintenanceTaskService from '#services/boat_maintenance_task_service'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { BoatFactory } from '#database/factories/boat_factory'
import { createAdminUser } from '#tests/functional/helpers'
import { ASSISTANT_MAX_STARTERS } from '#shared/types/assistant'

/**
 * Suggestions de démarrage du copilote : construites depuis l'état réel de la
 * flotte et la page courante — testées via le service (le middleware ne fait
 * que les ranger dans l'enveloppe de la prop partagée quand `conversation`
 * est nulle).
 */
test.group('Assistant FleetAi — suggestions de démarrage', (group) => {
  group.each.setup(() => truncateDb())

  test('flotte saine, aucune page : replis génériques, bornés', async ({ assert }) => {
    const user = await createAdminUser()
    const service = await app.container.make(AssistantStarterService)

    const starters = await service.buildStarters(user, null)

    assert.isAtMost(starters.length, ASSISTANT_MAX_STARTERS)
    assert.deepEqual(
      starters.map((s) => s.id),
      ['fleetSummary', 'help']
    )
  })

  test('des tâches en retard produisent le starter overdue en premier', async ({ assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({
      organizationId: user.organizationId!,
      name: 'Pen Duick',
    }).create()
    const taskService = await app.container.make(BoatMaintenanceTaskService)
    await taskService.createForBoat(user, boat, {
      subject: 'hull',
      title: 'Antifouling',
      notes: null,
      boatEngineId: null,
      dueAt: '2020-01-01',
      dueEngineHours: null,
      recurrenceIntervalMonths: null,
      recurrenceIntervalEngineHours: null,
    })

    const service = await app.container.make(AssistantStarterService)
    const starters = await service.buildStarters(user, null)

    assert.equal(starters[0].id, 'overdue')
    assert.equal(starters[0].params.count, '1')
    assert.equal(starters[0].i18nKey, 'assistant.starters.overdue')
  })

  test('une échéance en heures moteur est classée comme dans le planning', async ({ assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({
      organizationId: user.organizationId!,
      name: 'Pen Duick',
    }).create()
    const engine = await BoatEngineFactory.merge({ boatId: boat.id, hours: 300 }).create()
    const taskService = await app.container.make(BoatMaintenanceTaskService)
    // Compteur à 300 h, échéance à 250 h : en retard, comme le planning.
    await taskService.createForBoat(user, boat, {
      subject: 'engine',
      title: 'Vidange',
      notes: null,
      boatEngineId: engine.id,
      dueAt: null,
      dueEngineHours: 250,
      recurrenceIntervalMonths: null,
      recurrenceIntervalEngineHours: null,
    })

    const service = await app.container.make(AssistantStarterService)
    const starters = await service.buildStarters(user, null)

    assert.equal(starters[0].id, 'overdue')
    assert.equal(starters[0].params.count, '1')
  })

  test('une échéance en heures encore lointaine ne produit aucun starter de tâche', async ({
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({
      organizationId: user.organizationId!,
      name: 'Pen Duick',
    }).create()
    const engine = await BoatEngineFactory.merge({ boatId: boat.id, hours: 100 }).create()
    const taskService = await app.container.make(BoatMaintenanceTaskService)
    // 400 h restantes : ni en retard, ni bientôt due (seuil de 50 h).
    await taskService.createForBoat(user, boat, {
      subject: 'engine',
      title: 'Vidange',
      notes: null,
      boatEngineId: engine.id,
      dueAt: null,
      dueEngineHours: 500,
      recurrenceIntervalMonths: null,
      recurrenceIntervalEngineHours: null,
    })

    const service = await app.container.make(AssistantStarterService)
    const starters = await service.buildStarters(user, null)

    assert.deepEqual(
      starters.map((s) => s.id),
      ['fleetSummary', 'help']
    )
  })

  test('sur une fiche bateau, le starter de page porte le nom du bateau', async ({ assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({
      organizationId: user.organizationId!,
      name: 'Pen Duick',
    }).create()

    const service = await app.container.make(AssistantStarterService)
    const starters = await service.buildStarters(user, `/boats/${boat.id}`)

    const boatStarter = starters.find((s) => s.id === 'boatPage')
    assert.isDefined(boatStarter)
    assert.equal(boatStarter!.params.boat, 'Pen Duick')
  })

  test('un bateau d’une autre organisation ne produit aucun starter de page', async ({
    assert,
  }) => {
    const user = await createAdminUser()
    const other = await createAdminUser()
    const foreignBoat = await BoatFactory.merge({
      organizationId: other.organizationId!,
      name: 'Secret Yacht',
    }).create()

    const service = await app.container.make(AssistantStarterService)
    const starters = await service.buildStarters(user, `/boats/${foreignBoat.id}`)

    assert.isUndefined(starters.find((s) => s.id === 'boatPage'))
    assert.notInclude(JSON.stringify(starters), 'Secret Yacht')
  })

  test('chaque i18nKey de starter existe dans les deux locales', async ({ assert }) => {
    const { readFile } = await import('node:fs/promises')
    const ids = [
      'overdue',
      'dueSoon',
      'boatPage',
      'reservations',
      'navigation',
      'ports',
      'fleetSummary',
      'help',
    ]
    for (const locale of ['en', 'fr'] as const) {
      const translations = JSON.parse(
        await readFile(
          new URL(`../../../resources/lang/${locale}/assistant.json`, import.meta.url),
          'utf8'
        )
      ) as Record<string, unknown>
      const starters = translations.starters as Record<string, string>
      for (const id of ids) {
        assert.isString(starters[id], `assistant.starters.${id} manquante en ${locale}`)
      }
    }
  })
})
