import BoatMaintenanceTaskService from '#services/boat_maintenance_task_service'
import {
  BoatMaintenanceTaskNotFoundError,
  BoatMaintenanceTaskValidationError,
} from '#exceptions/maintenance_errors'
import MaintenanceTaskAssigned from '#events/maintenance_task_assigned'
import AuditLogService from '#services/audit_log_service'
import BoatHullService from '#services/boat_hull_service'
import { BoatNotFoundError } from '#exceptions/boat_errors'
import MaintenancePolicy from '#policies/maintenance_policy'
import {
  createBoatMaintenanceTaskValidator,
  markBoatMaintenanceTaskDoneValidator,
  updateBoatMaintenanceTaskValidator,
} from '#validators/boat_maintenance_task'
import { equipmentRefOf } from '#shared/helpers/maintenance_task_equipment'
import type Boat from '#models/boat'
import type BoatMaintenanceTask from '#models/boat_maintenance_task'
import type User from '#models/user'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class BoatMaintenanceTasksController {
  constructor(
    private boatService: BoatHullService,
    private boatMaintenanceTaskService: BoatMaintenanceTaskService,
    private auditLogService: AuditLogService
  ) {}

  async store({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    let boat
    try {
      boat = await this.boatService.getForUserOrFail(user, Number(params.boatId))
    } catch (error) {
      if (error instanceof BoatNotFoundError) {
        response.redirect('/boats')
        return
      }
      throw error
    }

    await bouncer.with(MaintenancePolicy).authorize('create', boat)

    const payload = await request.validateUsing(createBoatMaintenanceTaskValidator)

    try {
      const task = await this.boatMaintenanceTaskService.createForBoat(user, boat, {
        subject: payload.subject ?? null,
        boatEngineId: payload.boatEngineId ?? null,
        boatSailId: payload.boatSailId ?? null,
        boatRigId: payload.boatRigId ?? null,
        boatSafetyEquipmentId: payload.boatSafetyEquipmentId ?? null,
        boatGenericEquipmentId: payload.boatGenericEquipmentId ?? null,
        title: payload.title,
        notes: payload.notes ?? null,
        dueAt: payload.dueAt ?? null,
        recurrenceIntervalMonths: payload.recurrenceIntervalMonths ?? null,
        dueEngineHours: payload.dueEngineHours ?? null,
        recurrenceIntervalEngineHours: payload.recurrenceIntervalEngineHours ?? null,
        boatIncidentId: payload.boatIncidentId ?? null,
        assigneeId: payload.assigneeId ?? null,
        providerName: payload.providerName ?? null,
        estimatedCost: payload.estimatedCost ?? null,
        estimatedDurationMinutes: payload.estimatedDurationMinutes ?? null,
      })

      const equipment = equipmentRefOf(task)
      await this.auditLogService.log({
        organizationId: user.organizationId!,
        userId: user.id,
        action: 'maintenance_task.create',
        entityType: 'maintenance_task',
        entityId: task.id,
        metadata: {
          name: task.title,
          boatName: boat.name,
          ...(equipment ? { equipmentType: equipment.type } : {}),
          ...(task.boatIncidentId ? { incidentId: task.boatIncidentId } : {}),
        },
      })
      if (task.assigneeId !== null) await this.recordAssignment(user, boat, task)
    } catch (error) {
      if (
        error instanceof BoatMaintenanceTaskValidationError &&
        error.errorCode === 'dueEngineHoursNotAboveCurrent'
      ) {
        session.flashAll()
        session.flash('inputErrorsBag', {
          dueEngineHours: [
            i18n.t('validator.maintenanceTasks.dueEngineHoursNotAboveCurrent', {
              current: String(error.details.currentHours ?? 0),
            }),
          ],
        })
        response.redirect().back()
        return
      }
      if (error instanceof BoatMaintenanceTaskValidationError) {
        session.flash('error', i18n.t(`flash.maintenanceTasks.${error.errorCode}`))
        response.redirect().back()
        return
      }
      throw error
    }

    session.flash('success', i18n.t('flash.maintenanceTasks.created'))
    response.redirect().back()
  }

  /**
   * Modifie une tâche planifiée (#867) — formulaire complet ou report en un
   * clic (seule l'échéance est envoyée). Même capability que la clôture : qui
   * peut terminer une tâche peut la décaler.
   */
  async update({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    let boat
    try {
      boat = await this.boatService.getForUserOrFail(user, Number(params.boatId))
    } catch (error) {
      if (error instanceof BoatNotFoundError) {
        response.redirect('/boats')
        return
      }
      throw error
    }

    await bouncer.with(MaintenancePolicy).authorize('edit', boat)

    const payload = await request.validateUsing(updateBoatMaintenanceTaskValidator)

    let postponedOnly = false
    try {
      const { task, changedFields, postponed, assigneeChanged } =
        await this.boatMaintenanceTaskService.updateForBoat(
          user,
          boat,
          Number(params.taskId),
          payload
        )

      // Le changement de responsable a sa propre ligne d'audit (#868) ; la
      // ligne `update` / `postpone` ne couvre que le reste.
      const otherFields = changedFields.filter((f) => f !== 'assigneeId')
      if (assigneeChanged) await this.recordAssignment(user, boat, task)

      // Un report pur (seule l'échéance recule) est tracé comme tel : c'est le
      // geste que l'on veut compter, distinct d'une correction de la tâche.
      postponedOnly = postponed && otherFields.every((f) => f === 'dueAt' || f === 'dueEngineHours')

      if (otherFields.length > 0) {
        await this.auditLogService.log({
          organizationId: user.organizationId!,
          userId: user.id,
          action: postponedOnly ? 'maintenance_task.postpone' : 'maintenance_task.update',
          entityType: 'maintenance_task',
          entityId: task.id,
          metadata: {
            name: task.title,
            boatName: boat.name,
            fields: otherFields,
            ...(postponed ? { postponedCount: task.postponedCount } : {}),
          },
        })
      }
    } catch (error) {
      if (error instanceof BoatMaintenanceTaskNotFoundError) {
        session.flash('error', i18n.t('flash.maintenanceTasks.notFound'))
        response.redirect().back()
        return
      }
      if (
        error instanceof BoatMaintenanceTaskValidationError &&
        error.errorCode === 'dueEngineHoursNotAboveCurrent'
      ) {
        session.flashAll()
        session.flash('inputErrorsBag', {
          dueEngineHours: [
            i18n.t('validator.maintenanceTasks.dueEngineHoursNotAboveCurrent', {
              current: String(error.details.currentHours ?? 0),
            }),
          ],
        })
        response.redirect().back()
        return
      }
      if (error instanceof BoatMaintenanceTaskValidationError) {
        session.flash('error', i18n.t(`flash.maintenanceTasks.${error.errorCode}`))
        response.redirect().back()
        return
      }
      throw error
    }

    session.flash(
      'success',
      i18n.t(postponedOnly ? 'flash.maintenanceTasks.postponed' : 'flash.maintenanceTasks.updated')
    )
    response.redirect().back()
  }

  /**
   * Trace un changement de responsable (#868) et prévient le nouvel assigné.
   * Une désassignation (`assigneeId` à `null`) est journalisée sans notifier.
   */
  private async recordAssignment(user: User, boat: Boat, task: BoatMaintenanceTask) {
    await this.auditLogService.log({
      organizationId: user.organizationId!,
      userId: user.id,
      action: 'maintenance_task.assign',
      entityType: 'maintenance_task',
      entityId: task.id,
      metadata: { name: task.title, boatName: boat.name, assigneeId: task.assigneeId },
    })

    if (task.assigneeId === null) return
    await MaintenanceTaskAssigned.dispatch(
      boat.organizationId,
      { id: task.id, title: task.title, boatId: boat.id },
      boat.name,
      task.assigneeId,
      { id: user.id, name: user.fullName || user.email }
    )
  }

  async markDone({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    let boat
    try {
      boat = await this.boatService.getForUserOrFail(user, Number(params.boatId))
    } catch (error) {
      if (error instanceof BoatNotFoundError) {
        response.redirect('/boats')
        return
      }
      throw error
    }

    await bouncer.with(MaintenancePolicy).authorize('edit', boat)

    const payload = await request.validateUsing(markBoatMaintenanceTaskDoneValidator)

    try {
      const { task, completed } = await this.boatMaintenanceTaskService.markDone(
        user,
        boat,
        Number(params.taskId),
        {
          doneAt: payload.doneAt ?? undefined,
          doneEngineHours: payload.doneEngineHours ?? null,
          actualCost: payload.actualCost ?? null,
          actualDurationMinutes: payload.actualDurationMinutes ?? null,
        }
      )

      if (completed) {
        await this.auditLogService.log({
          organizationId: user.organizationId!,
          userId: user.id,
          action: 'maintenance_task.complete',
          entityType: 'maintenance_task',
          entityId: task.id,
          metadata: { name: task.title, boatName: boat.name },
        })
      }
    } catch (error) {
      if (error instanceof BoatMaintenanceTaskNotFoundError) {
        session.flash('error', i18n.t('flash.maintenanceTasks.notFound'))
        response.redirect().back()
        return
      }
      if (error instanceof BoatMaintenanceTaskValidationError) {
        session.flash('error', i18n.t(`flash.maintenanceTasks.${error.errorCode}`))
        response.redirect().back()
        return
      }
      throw error
    }

    session.flash('success', i18n.t('flash.maintenanceTasks.markedDone'))
    response.redirect().back()
  }

  async destroy({ response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    let boat
    try {
      boat = await this.boatService.getForUserOrFail(user, Number(params.boatId))
    } catch (error) {
      if (error instanceof BoatNotFoundError) {
        response.redirect('/boats')
        return
      }
      throw error
    }

    await bouncer.with(MaintenancePolicy).authorize('delete', boat)

    try {
      const task = await this.boatMaintenanceTaskService.deleteForBoat(
        user,
        boat,
        Number(params.taskId)
      )

      await this.auditLogService.log({
        organizationId: user.organizationId!,
        userId: user.id,
        action: 'maintenance_task.delete',
        entityType: 'maintenance_task',
        entityId: task.id,
        metadata: { name: task.title, boatName: boat.name },
      })
    } catch (error) {
      if (error instanceof BoatMaintenanceTaskNotFoundError) {
        session.flash('error', i18n.t('flash.maintenanceTasks.notFound'))
        response.redirect().back()
        return
      }
      throw error
    }

    session.flash('success', i18n.t('flash.maintenanceTasks.removed'))
    response.redirect().back()
  }
}
