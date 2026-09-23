import {
  BoatMaintenanceTaskNotFoundError,
  BoatMaintenanceTaskValidationError,
} from '#exceptions/maintenance_errors'
import BoatEngine from '#models/boat_engine'
import BoatGenericEquipment from '#models/boat_generic_equipment'
import BoatMaintenanceTask from '#models/boat_maintenance_task'
import BoatRig from '#models/boat_rig'
import BoatSafetyEquipment from '#models/boat_safety_equipment'
import BoatSail from '#models/boat_sail'
import Boat from '#models/boat'
import type User from '#models/user'
import { inject } from '@adonisjs/core'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import { DateTime } from 'luxon'
import {
  equipmentFieldName,
  equipmentRefsOf,
  requiredSubjectForEquipment,
  subjectForEquipment,
} from '#shared/helpers/maintenance_task_equipment'
import type { GenericEquipmentCategory } from '#shared/types/boat'
import type {
  CreateMaintenanceTaskPayload,
  MaintenanceTaskSubject,
  MarkTaskDonePayload,
  TaskEquipmentRef,
} from '#shared/types/maintenance'
import { assertBoatInUserOrg } from '#utils/boat_utils'
import { incidentBelongsToBoat } from '#utils/incident_utils'

export type { CreateMaintenanceTaskPayload, MaintenanceTaskSubject, MarkTaskDonePayload }

function toDateTime(value: Date | string | DateTime): DateTime {
  if (DateTime.isDateTime(value)) return value
  if (value instanceof Date) return DateTime.fromJSDate(value)
  return DateTime.fromISO(String(value))
}

const EQUIPMENT_MODELS = {
  engine: BoatEngine,
  sail: BoatSail,
  rig: BoatRig,
  safety: BoatSafetyEquipment,
  generic: BoatGenericEquipment,
} as const

/**
 * Charge l'équipement visé en le bornant au bateau : un id d'un autre bateau
 * (ou d'une autre organisation) est refusé. Renvoie la catégorie pour un
 * équipement générique, qui sert à déduire le sujet.
 */
async function findBoatEquipment(
  boatId: number,
  ref: TaskEquipmentRef
): Promise<{ genericCategory: GenericEquipmentCategory | null; engineHours: number | null }> {
  if (ref.type === 'generic') {
    const generic = await BoatGenericEquipment.query()
      .where('id', ref.id)
      .where('boatId', boatId)
      .select('id', 'category')
      .first()
    if (!generic) throw equipmentNotFound()
    return { genericCategory: generic.category as GenericEquipmentCategory, engineHours: null }
  }

  if (ref.type === 'engine') {
    const engine = await BoatEngine.query()
      .where('id', ref.id)
      .where('boatId', boatId)
      .select('id', 'hours')
      .first()
    if (!engine) throw equipmentNotFound()
    return { genericCategory: null, engineHours: engine.hours }
  }

  const found = await EQUIPMENT_MODELS[ref.type]
    .query()
    .where('id', ref.id)
    .where('boatId', boatId)
    .select('id')
    .first()
  if (!found) throw equipmentNotFound()
  return { genericCategory: null, engineHours: null }
}

function equipmentNotFound() {
  return new BoatMaintenanceTaskValidationError(
    'Equipment does not belong to this boat',
    'equipmentNotFound'
  )
}

/** Tâches ouvertes d'abord, puis datées avant non datées (NULLS LAST portable PG/SQLite). */
function orderTasks(query: ModelQueryBuilderContract<typeof BoatMaintenanceTask>) {
  return query
    .orderBy('status', 'asc')
    .orderByRaw('CASE WHEN due_at IS NULL THEN 1 ELSE 0 END')
    .orderBy('dueAt', 'asc')
    .orderBy('id', 'desc')
}

@inject()
export default class BoatMaintenanceTaskService {
  async listForBoat(user: User, boat: Boat) {
    assertBoatInUserOrg(user, boat, () => new BoatMaintenanceTaskNotFoundError())

    return await orderTasks(BoatMaintenanceTask.query().where('boatId', boat.id))
  }

  async createForBoat(user: User, boat: Boat, payload: CreateMaintenanceTaskPayload) {
    assertBoatInUserOrg(user, boat, () => new BoatMaintenanceTaskNotFoundError())

    const title = payload.title.trim()
    if (!title) throw new BoatMaintenanceTaskValidationError('title is required', 'titleRequired')

    const dueAt = payload.dueAt ? toDateTime(payload.dueAt) : null
    const dueEngineHours = payload.dueEngineHours ?? null
    const recurrenceEngineHours = payload.recurrenceIntervalEngineHours ?? null

    const refs = equipmentRefsOf(payload)
    if (refs.length > 1) {
      throw new BoatMaintenanceTaskValidationError(
        'A task targets at most one equipment',
        'multipleEquipment'
      )
    }
    const ref = refs[0] ?? null
    const equipment = ref ? await findBoatEquipment(boat.id, ref) : null

    const subject: MaintenanceTaskSubject =
      payload.subject ?? (ref ? subjectForEquipment(ref.type, equipment?.genericCategory) : 'boat')

    const requiredSubject = ref ? requiredSubjectForEquipment(ref.type) : null
    if (requiredSubject !== null && subject !== requiredSubject) {
      throw new BoatMaintenanceTaskValidationError(
        `Subject ${subject} does not match ${requiredSubject} equipment`,
        'subjectEquipmentMismatch'
      )
    }

    if ((dueEngineHours !== null || recurrenceEngineHours !== null) && subject !== 'engine') {
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

    // Une échéance au compteur actuel (ou en dessous) serait en retard dès sa création.
    const currentEngineHours = equipment?.engineHours ?? 0
    if (dueEngineHours !== null && dueEngineHours <= currentEngineHours) {
      throw new BoatMaintenanceTaskValidationError(
        'dueEngineHours must be above the current engine hours',
        'dueEngineHoursNotAboveCurrent',
        { currentHours: currentEngineHours }
      )
    }

    const notes = payload.notes?.trim() ? payload.notes.trim() : null

    // Suite d'un incident (#815) : l'incident tracé doit être du bateau.
    const boatIncidentId = payload.boatIncidentId ?? null
    if (boatIncidentId !== null && !(await incidentBelongsToBoat(boat.id, boatIncidentId))) {
      throw new BoatMaintenanceTaskValidationError(
        'Incident does not belong to this boat',
        'incidentNotFound'
      )
    }

    const equipmentColumns = {
      boatEngineId: null,
      boatSailId: null,
      boatRigId: null,
      boatSafetyEquipmentId: null,
      boatGenericEquipmentId: null,
      ...(ref ? { [equipmentFieldName(ref.type)]: ref.id } : {}),
    }

    return await BoatMaintenanceTask.create({
      boatId: boat.id,
      subject,
      ...equipmentColumns,
      boatIncidentId,
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

  /**
   * Marks a task as done. `completed` is false when the task was already
   * closed, so callers can skip journalling a no-op completion.
   */
  async markDone(
    user: User,
    boat: Boat,
    taskId: number,
    payload: MarkTaskDonePayload
  ): Promise<{ task: BoatMaintenanceTask; completed: boolean }> {
    assertBoatInUserOrg(user, boat, () => new BoatMaintenanceTaskNotFoundError())

    const task = await BoatMaintenanceTask.query()
      .where('id', taskId)
      .where('boatId', boat.id)
      .first()

    if (!task) throw new BoatMaintenanceTaskNotFoundError()
    if (task.status === 'done') return { task, completed: false }

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
        boatSafetyEquipmentId: task.boatSafetyEquipmentId,
        boatGenericEquipmentId: task.boatGenericEquipmentId,
        // Seule la première occurrence trace l'incident (#815) : la
        // récurrence est un entretien courant, plus une suite d'incident.
        boatIncidentId: null,
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

    return { task, completed: true }
  }

  async deleteForBoat(user: User, boat: Boat, taskId: number) {
    assertBoatInUserOrg(user, boat, () => new BoatMaintenanceTaskNotFoundError())

    const task = await BoatMaintenanceTask.query()
      .where('id', taskId)
      .where('boatId', boat.id)
      .first()

    if (!task) throw new BoatMaintenanceTaskNotFoundError()

    await task.delete()

    return task
  }

  /**
   * Tâches rattachées à un équipement du bateau (moteur, voile, gréement,
   * sécurité, générique). Le bateau doit déjà être autorisé par l'appelant.
   */
  async listForEquipment(boatId: number, ref: TaskEquipmentRef) {
    return await orderTasks(
      BoatMaintenanceTask.query()
        .where('boatId', boatId)
        .where(equipmentFieldName(ref.type), ref.id)
    )
  }

  /**
   * Bateau de l'organisation avec tous ses équipements, pour proposer les cibles
   * d'une tâche hors fiche bateau (dashboard). `null` si le bateau est hors périmètre.
   */
  async findBoatWithEquipment(user: User, boatId: number) {
    if (user.organizationId === null) return null
    return await Boat.query()
      .where('id', boatId)
      .where('organizationId', user.organizationId)
      .preload('engines')
      .preload('sails')
      .preload('rig')
      .preload('safetyEquipment')
      .preload('genericEquipment')
      .first()
  }

  async listForEngine(boatId: number, engineId: number) {
    return await this.listForEquipment(boatId, { type: 'engine', id: engineId })
  }

  /**
   * Tâches créées depuis un incident du bateau (#815). Bornées au bateau : un
   * id d'incident d'un autre bateau ne remonte rien. Le bateau doit déjà être
   * autorisé par l'appelant.
   */
  async listForIncident(boatId: number, incidentId: number) {
    return await orderTasks(
      BoatMaintenanceTask.query().where('boatId', boatId).where('boatIncidentId', incidentId)
    )
  }
}
