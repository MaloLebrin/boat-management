import BoatMaintenanceTaskService, {
  BoatMaintenanceTaskNotFoundError,
  BoatMaintenanceTaskValidationError,
} from '#services/boat_maintenance_task_service'
import AuditLogService from '#services/audit_log_service'
import BoatService, { BoatNotFoundError } from '#services/boat_service'
import MaintenancePolicy from '#policies/maintenance_policy'
import {
  createBoatMaintenanceTaskValidator,
  markBoatMaintenanceTaskDoneValidator,
} from '#validators/boat_maintenance_task'
import { equipmentRefOf } from '#shared/helpers/maintenance_task_equipment'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class BoatMaintenanceTasksController {
  constructor(
    private boatService: BoatService,
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
        },
      })
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
