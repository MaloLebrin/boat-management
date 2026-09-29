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
import OrganizationMembership from '#models/organization_membership'
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
import { decimalColumnToNumber } from '#shared/helpers/number_format'
import type { GenericEquipmentCategory } from '#shared/types/boat'
import { ROLE_PERMISSIONS } from '#shared/types/permissions'
import type {
  CreateMaintenanceTaskPayload,
  MaintenanceAssigneeOption,
  MaintenanceTaskEditableField,
  MaintenanceTaskSubject,
  MaintenanceTaskUpdateOutcome,
  MarkTaskDonePayload,
  TaskEquipmentRef,
  UpdateMaintenanceTaskPayload,
} from '#shared/types/maintenance'
import { assertBoatInUserOrg } from '#utils/boat_utils'
import { incidentBelongsToBoat } from '#utils/incident_utils'

export type {
  CreateMaintenanceTaskPayload,
  MaintenanceTaskSubject,
  MarkTaskDonePayload,
  UpdateMaintenanceTaskPayload,
}

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

/**
 * Membre à qui l'on peut confier une tâche (#868) : il appartient à
 * l'organisation **et** son rôle peut modifier la maintenance — un
 * propriétaire de bateau (portail en lecture seule) ne peut pas clôturer ce
 * qu'on lui assignerait. Un id d'une autre organisation est refusé au même
 * titre qu'un id inconnu.
 */
async function assertAssignable(organizationId: number, userId: number): Promise<void> {
  const membership = await OrganizationMembership.query()
    .where('organizationId', organizationId)
    .where('userId', userId)
    .select('id', 'role')
    .first()
  if (!membership || !ROLE_PERMISSIONS[membership.role].has('maintenance.edit')) {
    throw new BoatMaintenanceTaskValidationError(
      'Assignee is not a maintenance member of this organization',
      'assigneeNotMember'
    )
  }
}

/** Texte libre d'une ligne, `null` quand il est vide. */
function trimmedOrNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

/** Tâches ouvertes d'abord, puis datées avant non datées (NULLS LAST portable PG/SQLite). */
function orderTasks(query: ModelQueryBuilderContract<typeof BoatMaintenanceTask>) {
  return query
    .preload('assignee', (q) => q.select('id', 'fullName', 'email'))
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

    const assigneeId = payload.assigneeId ?? null
    if (assigneeId !== null) await assertAssignable(boat.organizationId, assigneeId)

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
      organizationId: boat.organizationId,
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
      assigneeId,
      assignedAt: assigneeId !== null ? DateTime.now() : null,
      providerName: trimmedOrNull(payload.providerName),
      estimatedCost:
        payload.estimatedCost === null || payload.estimatedCost === undefined
          ? null
          : String(payload.estimatedCost),
      estimatedDurationMinutes: payload.estimatedDurationMinutes ?? null,
    })
  }

  /**
   * Modifie une tâche planifiée (#867). Seuls les champs présents dans le
   * payload sont touchés (`null` vide le champ). Une tâche close est de
   * l'historique : elle ne se modifie plus. Changer l'intervalle de récurrence
   * ne touche que les occurrences à venir — la suivante est créée à la clôture
   * avec l'intervalle en vigueur à ce moment-là.
   *
   * Reculer l'échéance (date ou heures moteur) compte comme un report et
   * incrémente `postponedCount`.
   */
  async updateForBoat(
    user: User,
    boat: Boat,
    taskId: number,
    payload: UpdateMaintenanceTaskPayload
  ): Promise<{ task: BoatMaintenanceTask } & MaintenanceTaskUpdateOutcome> {
    assertBoatInUserOrg(user, boat, () => new BoatMaintenanceTaskNotFoundError())

    const task = await BoatMaintenanceTask.query()
      .where('id', taskId)
      .where('boatId', boat.id)
      .first()

    if (!task) throw new BoatMaintenanceTaskNotFoundError()
    if (task.status === 'done') {
      throw new BoatMaintenanceTaskValidationError('A completed task is history', 'taskDone')
    }

    const changedFields: MaintenanceTaskEditableField[] = []
    let postponed = false
    let assigneeChanged = false

    if (payload.title !== undefined) {
      const title = payload.title.trim()
      if (!title) throw new BoatMaintenanceTaskValidationError('title is required', 'titleRequired')
      if (title !== task.title) {
        task.title = title
        changedFields.push('title')
      }
    }

    if (payload.notes !== undefined) {
      const notes = payload.notes?.trim() ? payload.notes.trim() : null
      if (notes !== task.notes) {
        task.notes = notes
        changedFields.push('notes')
      }
    }

    if (payload.dueAt !== undefined) {
      const dueAt = payload.dueAt === null ? null : toDateTime(payload.dueAt).startOf('day')
      const previous = task.dueAt
      if (dueAt?.toISODate() !== previous?.toISODate()) {
        task.dueAt = dueAt
        changedFields.push('dueAt')
        if (previous && dueAt && dueAt > previous) postponed = true
      }
    }

    if (payload.recurrenceIntervalMonths !== undefined) {
      const months = payload.recurrenceIntervalMonths || null
      if (months !== task.recurrenceIntervalMonths) {
        task.recurrenceIntervalMonths = months
        changedFields.push('recurrenceIntervalMonths')
      }
    }

    const engineHoursTouched =
      (payload.dueEngineHours !== undefined && payload.dueEngineHours !== null) ||
      (payload.recurrenceIntervalEngineHours !== undefined &&
        payload.recurrenceIntervalEngineHours !== null)
    if (engineHoursTouched) {
      // Mêmes règles qu'à la création : le sujet et le moteur sont figés, une
      // tâche qui n'en a pas ne devient pas une tâche au compteur.
      if (task.subject !== 'engine') {
        throw new BoatMaintenanceTaskValidationError(
          'Engine-hour tasks must have subject=engine',
          'engineSubjectRequired'
        )
      }
      if (!task.boatEngineId) {
        throw new BoatMaintenanceTaskValidationError(
          'boatEngineId is required for engine-hour tasks',
          'engineIdRequired'
        )
      }
    }

    if (payload.dueEngineHours !== undefined) {
      const dueEngineHours = payload.dueEngineHours
      const previous = task.dueEngineHours
      if (dueEngineHours !== previous) {
        if (dueEngineHours !== null) {
          const engine = await findBoatEquipment(boat.id, {
            type: 'engine',
            id: task.boatEngineId!,
          })
          const currentEngineHours = engine.engineHours ?? 0
          if (dueEngineHours <= currentEngineHours) {
            throw new BoatMaintenanceTaskValidationError(
              'dueEngineHours must be above the current engine hours',
              'dueEngineHoursNotAboveCurrent',
              { currentHours: currentEngineHours }
            )
          }
        }
        task.dueEngineHours = dueEngineHours
        changedFields.push('dueEngineHours')
        if (previous !== null && dueEngineHours !== null && dueEngineHours > previous) {
          postponed = true
        }
      }
    }

    if (payload.recurrenceIntervalEngineHours !== undefined) {
      const interval = payload.recurrenceIntervalEngineHours || null
      if (interval !== task.recurrenceIntervalEngineHours) {
        task.recurrenceIntervalEngineHours = interval
        changedFields.push('recurrenceIntervalEngineHours')
      }
    }

    // Ordre de travail (#868).
    if (payload.assigneeId !== undefined && payload.assigneeId !== task.assigneeId) {
      if (payload.assigneeId !== null) {
        await assertAssignable(boat.organizationId, payload.assigneeId)
      }
      task.assigneeId = payload.assigneeId
      task.assignedAt = payload.assigneeId !== null ? DateTime.now() : null
      changedFields.push('assigneeId')
      assigneeChanged = true
    }

    if (payload.providerName !== undefined) {
      const providerName = trimmedOrNull(payload.providerName)
      if (providerName !== task.providerName) {
        task.providerName = providerName
        changedFields.push('providerName')
      }
    }

    if (payload.estimatedCost !== undefined) {
      if (payload.estimatedCost !== decimalColumnToNumber(task.estimatedCost)) {
        task.estimatedCost = payload.estimatedCost === null ? null : String(payload.estimatedCost)
        changedFields.push('estimatedCost')
      }
    }

    if (payload.estimatedDurationMinutes !== undefined) {
      const minutes = payload.estimatedDurationMinutes ?? null
      if (minutes !== task.estimatedDurationMinutes) {
        task.estimatedDurationMinutes = minutes
        changedFields.push('estimatedDurationMinutes')
      }
    }

    if (postponed) task.postponedCount += 1
    if (changedFields.length > 0) await task.save()

    return { task, changedFields, postponed, assigneeChanged }
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
    // Réalisé face au prévu (#868) — seulement s'il est saisi.
    if (payload.actualCost !== undefined && payload.actualCost !== null) {
      task.actualCost = String(payload.actualCost)
    }
    if (payload.actualDurationMinutes !== undefined && payload.actualDurationMinutes !== null) {
      task.actualDurationMinutes = payload.actualDurationMinutes
    }
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
        organizationId: task.organizationId,
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
        // L'occurrence suivante reste le même ordre de travail : même
        // responsable, même prestataire, même estimation. Le réel, lui, est
        // propre à chaque clôture.
        assigneeId: task.assigneeId,
        assignedAt: task.assigneeId !== null ? DateTime.now() : null,
        providerName: task.providerName,
        estimatedCost: task.estimatedCost,
        estimatedDurationMinutes: task.estimatedDurationMinutes,
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

  /**
   * Membres à qui une tâche peut être confiée (#868), triés par nom — le
   * sélecteur des formulaires de tâche et le filtre « Assigné à » du planning.
   */
  async listAssignees(user: User): Promise<MaintenanceAssigneeOption[]> {
    if (user.organizationId === null) return []
    const memberships = await OrganizationMembership.query()
      .where('organizationId', user.organizationId)
      .preload('user', (q) => q.select('id', 'fullName', 'email'))
    return memberships
      .filter((m) => ROLE_PERMISSIONS[m.role].has('maintenance.edit'))
      .map((m) => ({ id: m.user.id, fullName: m.user.fullName || m.user.email }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
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
