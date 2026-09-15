import BoatMaintenanceTask from '#models/boat_maintenance_task'
import Factory from '@adonisjs/lucid/factories'
import type { FactoryContextContract } from '@adonisjs/lucid/types/factory'
import { DateTime } from 'luxon'
import { BoatFactory } from '#database/factories/boat_factory'

/**
 * Tâche ouverte sur le sujet `boat`, échéance dans 30 jours. États :
 * `overdue` (échéance passée), `done` (réalisée), `noDueDate`.
 */
export const BoatMaintenanceTaskFactory = Factory.define(
  BoatMaintenanceTask,
  ({ faker }: FactoryContextContract) => ({
    subject: 'boat',
    status: 'open',
    title: faker.lorem.words(3),
    notes: null,
    boatEngineId: null,
    boatSailId: null,
    boatRigId: null,
    boatSafetyEquipmentId: null,
    boatGenericEquipmentId: null,
    dueAt: DateTime.now().startOf('day').plus({ days: 30 }),
    dueEngineHours: null,
    doneAt: null,
    doneEngineHours: null,
    lastDoneEngineHours: null,
    recurrenceIntervalMonths: null,
    recurrenceIntervalEngineHours: null,
  })
)
  .state('overdue', (task) => {
    task.dueAt = DateTime.now().startOf('day').minus({ days: 1 })
  })
  .state('done', (task) => {
    task.status = 'done'
    task.doneAt = DateTime.now().startOf('day')
  })
  .state('noDueDate', (task) => {
    task.dueAt = null
  })
  .relation('boat', () => BoatFactory)
  .build()
