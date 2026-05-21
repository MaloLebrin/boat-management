import {
  BoatMaintenanceTaskNotFoundError,
  BoatMaintenanceTaskValidationError,
} from '#exceptions/maintenance_errors'
import BoatMaintenanceTask from '#models/boat_maintenance_task'
import type Boat from '#models/boat'
import type User from '#models/user'
import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import type {
  CreateMaintenanceTaskPayload,
  MaintenanceTaskSubject,
  MarkTaskDonePayload,
} from '#shared/types/maintenance'

export { BoatMaintenanceTaskNotFoundError, BoatMaintenanceTaskValidationError }
export type { CreateMaintenanceTaskPayload, MaintenanceTaskSubject, MarkTaskDonePayload }

function toDateTime(value: Date | string | DateTime): DateTime {
  if (DateTime.isDateTime(value)) return value
  if (value instanceof Date) return DateTime.fromJSDate(value)
  return DateTime.fromISO(String(value))
}

function assertBoatScope(user: User, boat: Boat) {
  if (user.organizationId === null || user.organizationId !== boat.organizationId) {
    throw new BoatMaintenanceTaskNotFoundError()
  }
}

@inject()
export default class BoatMaintenanceTaskService {
  async listForBoat(user: User, boat: Boat) {
    assertBoatScope(user, boat)

    return await BoatMaintenanceTask.query()
      .where('boatId', boat.id)
      .orderBy('status', 'asc')
      .orderBy('dueAt', 'asc')
      .orderBy('id', 'desc')
  }

  async createForBoat(user: User, boat: Boat, payload: CreateMaintenanceTaskPayload) {
    assertBoatScope(user, boat)

    const title = payload.title.trim()
    if (!title) throw new BoatMaintenanceTaskValidationError('title is required', 'titleRequired')

    const dueAt = payload.dueAt ? toDateTime(payload.dueAt) : null
    const dueEngineHours = payload.dueEngineHours ?? null
    const recurrenceEngineHours = payload.recurrenceIntervalEngineHours ?? null

    if (!dueAt && dueEngineHours === null) {
      throw new BoatMaintenanceTaskValidationError(
        'Either dueAt or dueEngineHours is required',
        'dueRequired'
      )
    }

    if (
      (dueEngineHours !== null || recurrenceEngineHours !== null) &&
      payload.subject !== 'engine'
    ) {
      throw new BoatMaintenanceTaskValidationError(
        'Engine-hour tasks must have subject=engine',
        'engineSubjectRequired'
      )
    }

    if ((dueEngineHours !== null || recurrenceEngineHours !== null) && !payload.boatEngineId) {
      throw new BoatMaintenanceTaskValidationError(
        'boatEngineId is required for engine-hour tasks',
        'engineIdRequired'
      )
    }

    const notes = payload.notes?.trim() ? payload.notes.trim() : null

    return await BoatMaintenanceTask.create({
      boatId: boat.id,
      subject: payload.subject,
      boatEngineId: payload.boatEngineId ?? null,
      boatSailId: payload.boatSailId ?? null,
      boatRigId: payload.boatRigId ?? null,
      title,
      notes,
      status: 'open',
      doneAt: null,
      dueAt,
      recurrenceIntervalMonths: payload.recurrenceIntervalMonths ?? null,
      dueEngineHours,
      recurrenceIntervalEngineHours: recurrenceEngineHours,
      lastDoneEngineHours: null,
      doneEngineHours: null,
    })
  }

  async markDone(user: User, boat: Boat, taskId: number, payload: MarkTaskDonePayload) {
    assertBoatScope(user, boat)

    const task = await BoatMaintenanceTask.query()
      .where('id', taskId)
      .where('boatId', boat.id)
      .first()

    if (!task) throw new BoatMaintenanceTaskNotFoundError()
    if (task.status === 'done') return task

    const doneAt = toDateTime(payload.doneAt ?? DateTime.now())

    let doneEngineHours: number | null = null
    if (task.dueEngineHours !== null || task.recurrenceIntervalEngineHours !== null) {
      const raw = payload.doneEngineHours
      if (raw === null || raw === undefined) {
        throw new BoatMaintenanceTaskValidationError(
          'doneEngineHours is required to complete this task',
          'doneEngineHoursRequired'
        )
      }
      if (!Number.isInteger(raw) || raw < 0) {
        throw new BoatMaintenanceTaskValidationError(
          'doneEngineHours must be a non-negative integer',
          'doneEngineHoursInvalid'
        )
      }
      doneEngineHours = raw
    }

    task.status = 'done'
    task.doneAt = doneAt
    task.doneEngineHours = doneEngineHours
    if (doneEngineHours !== null) task.lastDoneEngineHours = doneEngineHours
    await task.save()

    // Auto-create next task when recurrence is configured
    const nextDueAt =
      task.recurrenceIntervalMonths && task.recurrenceIntervalMonths > 0
        ? doneAt.plus({ months: task.recurrenceIntervalMonths }).startOf('day')
        : null

    const nextDueEngineHours =
      task.recurrenceIntervalEngineHours &&
      task.recurrenceIntervalEngineHours > 0 &&
      doneEngineHours !== null
        ? doneEngineHours + task.recurrenceIntervalEngineHours
        : null

    if (nextDueAt || nextDueEngineHours !== null) {
      await BoatMaintenanceTask.create({
        boatId: task.boatId,
        subject: task.subject,
        boatEngineId: task.boatEngineId,
        boatSailId: task.boatSailId,
        boatRigId: task.boatRigId,
        title: task.title,
        notes: task.notes,
        status: 'open',
        doneAt: null,
        dueAt: nextDueAt,
        recurrenceIntervalMonths: task.recurrenceIntervalMonths,
        dueEngineHours: nextDueEngineHours,
        recurrenceIntervalEngineHours: task.recurrenceIntervalEngineHours,
        lastDoneEngineHours: doneEngineHours,
        doneEngineHours: null,
      })
    }

    return task
  }

  async deleteForBoat(user: User, boat: Boat, taskId: number) {
    assertBoatScope(user, boat)

    const task = await BoatMaintenanceTask.query()
      .where('id', taskId)
      .where('boatId', boat.id)
      .first()

    if (!task) throw new BoatMaintenanceTaskNotFoundError()

    await task.delete()
  }

  /**
   * Lists maintenance tasks for a specific engine.
   */
  async listForEngine(boatId: number, engineId: number) {
    return await BoatMaintenanceTask.query()
      .where('boatId', boatId)
      .where('boatEngineId', engineId)
      .orderBy('status', 'asc')
      .orderBy('dueAt', 'asc')
      .orderBy('id', 'desc')
  }
}
