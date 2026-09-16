import BoatEquipmentAction from '#models/boat_equipment_action'
import Factory from '@adonisjs/lucid/factories'
import type { FactoryContextContract } from '@adonisjs/lucid/types/factory'
import { DateTime } from 'luxon'
import { BoatFactory } from '#database/factories/boat_factory'
import { UserFactory } from '#database/factories/user_factory'

/**
 * Action « à acheter » en attente, sans équipement ni inspection liés.
 * `createdBy` (et `organizationId`) sont à fournir via `merge()` ou la
 * relation `creator`. État `done` pour une action résolue.
 */
export const BoatEquipmentActionFactory = Factory.define(
  BoatEquipmentAction,
  ({ faker }: FactoryContextContract) => ({
    actionType: 'to_buy',
    status: 'pending',
    label: faker.commerce.productName(),
    notes: null,
    equipmentType: null,
    equipmentId: null,
    inspectionId: null,
    estimatedCost: null,
    actualCost: null,
    resolvedAt: null,
  })
)
  .state('done', (action) => {
    action.status = 'done'
    action.resolvedAt = DateTime.now()
  })
  .relation('boat', () => BoatFactory)
  .relation('creator', () => UserFactory)
  .build()
