import {
  BoatEquipmentActionNotFoundError,
  BoatEquipmentActionValidationError,
} from '#exceptions/equipment_action_errors'
import BoatEquipmentAction from '#models/boat_equipment_action'
import type Boat from '#models/boat'
import type BoatInspection from '#models/boat_inspection'
import type User from '#models/user'
import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import type {
  CreateEquipmentActionPayload,
  UpdateEquipmentActionPayload,
} from '#shared/types/equipment_action'

const ACTION_COLUMNS: string[] = [
  'id',
  'boatId',
  'organizationId',
  'actionType',
  'status',
  'label',
  'notes',
  'estimatedCost',
  'actualCost',
  'equipmentType',
  'equipmentId',
  'inspectionId',
  'createdBy',
  'resolvedAt',
  'createdAt',
  'updatedAt',
]

function assertBoatScope(user: User, boat: Boat) {
  if (user.organizationId === null || user.organizationId !== boat.organizationId) {
    throw new BoatEquipmentActionNotFoundError()
  }
}

@inject()
export default class BoatEquipmentActionService {
  async listForBoat(user: User, boat: Boat) {
    assertBoatScope(user, boat)

    return await BoatEquipmentAction.query()
      .select(ACTION_COLUMNS)
      .where('boatId', boat.id)
      .orderBy('createdAt', 'desc')
      .orderBy('id', 'desc')
  }

  /**
   * Equipment actions raised from a specific rental inspection (#311). Scoped
   * to the boat so an inspection id from another boat surfaces nothing.
   */
  async listForInspection(user: User, boat: Boat, inspection: BoatInspection) {
    assertBoatScope(user, boat)

    return await BoatEquipmentAction.query()
      .select(ACTION_COLUMNS)
      .where('boatId', boat.id)
      .where('inspectionId', inspection.id)
      .orderBy('createdAt', 'desc')
      .orderBy('id', 'desc')
  }

  async createForBoat(user: User, boat: Boat, payload: CreateEquipmentActionPayload) {
    assertBoatScope(user, boat)

    const label = payload.label.trim()
    if (!label) {
      throw new BoatEquipmentActionValidationError('label is required', 'labelRequired')
    }

    return await BoatEquipmentAction.create({
      boatId: boat.id,
      organizationId: boat.organizationId,
      actionType: payload.actionType,
      status: 'pending',
      label,
      notes: payload.notes?.trim() || null,
      estimatedCost: payload.estimatedCost?.toString() ?? null,
      actualCost: null,
      equipmentType: payload.equipmentType ?? null,
      equipmentId: payload.equipmentId ?? null,
      createdBy: user.id,
    })
  }

  /**
   * Creates an equipment action attached to a rental inspection (#311). The
   * boat/org are taken from the resolved boat (deduced from the inspection's
   * reservation upstream), never from the payload.
   */
  async createFromInspection(
    user: User,
    boat: Boat,
    inspection: BoatInspection,
    payload: CreateEquipmentActionPayload
  ) {
    assertBoatScope(user, boat)

    const label = payload.label.trim()
    if (!label) {
      throw new BoatEquipmentActionValidationError('label is required', 'labelRequired')
    }

    return await BoatEquipmentAction.create({
      boatId: boat.id,
      organizationId: boat.organizationId,
      actionType: payload.actionType,
      status: 'pending',
      label,
      notes: payload.notes?.trim() || null,
      estimatedCost: payload.estimatedCost?.toString() ?? null,
      actualCost: null,
      equipmentType: payload.equipmentType ?? null,
      equipmentId: payload.equipmentId ?? null,
      inspectionId: inspection.id,
      createdBy: user.id,
    })
  }

  async updateForBoat(
    user: User,
    boat: Boat,
    actionId: number,
    payload: UpdateEquipmentActionPayload
  ) {
    assertBoatScope(user, boat)

    const action = await BoatEquipmentAction.query()
      .where('id', actionId)
      .where('boatId', boat.id)
      .first()

    if (!action) throw new BoatEquipmentActionNotFoundError()

    if (payload.label !== undefined) {
      const label = payload.label.trim()
      if (!label) {
        throw new BoatEquipmentActionValidationError('label is required', 'labelRequired')
      }
      action.label = label
    }

    if (payload.actionType !== undefined) action.actionType = payload.actionType
    if (payload.notes !== undefined) action.notes = payload.notes?.trim() || null
    if (payload.estimatedCost !== undefined) {
      action.estimatedCost = payload.estimatedCost?.toString() ?? null
    }
    if (payload.actualCost !== undefined) {
      action.actualCost = payload.actualCost?.toString() ?? null
    }
    if (payload.equipmentType !== undefined) action.equipmentType = payload.equipmentType ?? null
    if (payload.equipmentId !== undefined) action.equipmentId = payload.equipmentId ?? null

    if (payload.status !== undefined) {
      // Business rule: done status requires actual_cost
      if (payload.status === 'done') {
        const actualCost =
          payload.actualCost ?? (action.actualCost ? Number(action.actualCost) : null)
        if (actualCost === null || actualCost === undefined) {
          throw new BoatEquipmentActionValidationError(
            'actual_cost is required when marking as done',
            'actualCostRequired'
          )
        }
      }

      action.status = payload.status

      // Auto-set resolvedAt when done
      if (payload.status === 'done' && !action.resolvedAt) {
        action.resolvedAt = DateTime.now()
      } else if (payload.status !== 'done') {
        action.resolvedAt = null
      }
    }

    await action.save()
    return action
  }

  async deleteForBoat(user: User, boat: Boat, actionId: number) {
    assertBoatScope(user, boat)

    const action = await BoatEquipmentAction.query()
      .where('id', actionId)
      .where('boatId', boat.id)
      .first()

    if (!action) throw new BoatEquipmentActionNotFoundError()
    await action.delete()
  }
}
