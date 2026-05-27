import {
  BoatMaintenanceSheetItemNotFoundError,
  BoatMaintenanceSheetNotFoundError,
} from '#exceptions/maintenance_errors'
import BoatMaintenanceSheet from '#models/boat_maintenance_sheet'
import BoatMaintenanceSheetItem from '#models/boat_maintenance_sheet_item'
import BoatMaintenanceSheetTemplateService from '#services/boat_maintenance_sheet_template_service'
import type { CreateSheetPayload, SheetType, UpdateItemPayload } from '#shared/types/maintenance'
import type Boat from '#models/boat'
import type User from '#models/user'
import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'

export { BoatMaintenanceSheetItemNotFoundError, BoatMaintenanceSheetNotFoundError }
export type { CreateSheetPayload, SheetType, UpdateItemPayload }

function toDateTime(value: Date | DateTime): DateTime {
  if (DateTime.isDateTime(value)) return value
  return DateTime.fromJSDate(value)
}

function assertBoatScope(user: User, boat: Boat) {
  if (user.organizationId === null || user.organizationId !== boat.organizationId) {
    throw new BoatMaintenanceSheetNotFoundError()
  }
}

@inject()
export default class BoatMaintenanceSheetService {
  constructor(private templateService: BoatMaintenanceSheetTemplateService) {}

  /**
   * Lists all maintenance sheets for a boat, ordered by performedAt desc.
   * Items are preloaded and ordered by position asc.
   */
  async listForBoat(user: User, boat: Boat): Promise<BoatMaintenanceSheet[]> {
    assertBoatScope(user, boat)

    return await BoatMaintenanceSheet.query()
      .where('boatId', boat.id)
      .orderBy('performedAt', 'desc')
      .preload('items', (query) => {
        query.orderBy('position', 'asc')
      })
  }

  /**
   * Creates a new maintenance sheet for a boat with default items from template.
   */
  async createForBoat(
    user: User,
    boat: Boat,
    payload: CreateSheetPayload
  ): Promise<BoatMaintenanceSheet> {
    assertBoatScope(user, boat)

    const sheet = await BoatMaintenanceSheet.create({
      boatId: boat.id,
      type: payload.type,
      title: payload.title.trim(),
      performedAt: toDateTime(payload.performedAt),
      notes: payload.notes?.trim() || null,
      status: 'in_progress',
    })

    const templateItems = this.templateService.getItems(payload.type)

    await Promise.all(
      templateItems.map((item) =>
        BoatMaintenanceSheetItem.create({
          boatMaintenanceSheetId: sheet.id,
          label: item.label,
          position: item.position,
          isDone: false,
          notes: null,
        })
      )
    )

    await sheet.load('items', (query) => {
      query.orderBy('position', 'asc')
    })

    return sheet
  }

  /**
   * Marks a maintenance sheet as completed.
   */
  async completeSheet(user: User, boat: Boat, sheetId: number): Promise<void> {
    assertBoatScope(user, boat)

    const sheet = await BoatMaintenanceSheet.query()
      .where('id', sheetId)
      .where('boatId', boat.id)
      .first()

    if (!sheet) {
      throw new BoatMaintenanceSheetNotFoundError()
    }

    sheet.status = 'completed'
    await sheet.save()
  }

  /**
   * Deletes a maintenance sheet and its items.
   */
  async deleteSheet(user: User, boat: Boat, sheetId: number): Promise<void> {
    assertBoatScope(user, boat)

    const sheet = await BoatMaintenanceSheet.query()
      .where('id', sheetId)
      .where('boatId', boat.id)
      .first()

    if (!sheet) {
      throw new BoatMaintenanceSheetNotFoundError()
    }

    await sheet.delete()
  }

  /**
   * Updates a specific item in a maintenance sheet.
   */
  async updateItem(
    user: User,
    boat: Boat,
    sheetId: number,
    itemId: number,
    payload: UpdateItemPayload
  ): Promise<void> {
    assertBoatScope(user, boat)

    const sheet = await BoatMaintenanceSheet.query()
      .where('id', sheetId)
      .where('boatId', boat.id)
      .first()

    if (!sheet) {
      throw new BoatMaintenanceSheetNotFoundError()
    }

    const item = await BoatMaintenanceSheetItem.query()
      .where('id', itemId)
      .where('boatMaintenanceSheetId', sheetId)
      .first()

    if (!item) {
      throw new BoatMaintenanceSheetItemNotFoundError()
    }

    item.isDone = payload.isDone
    item.notes = payload.notes?.trim() || null
    await item.save()
  }
}
