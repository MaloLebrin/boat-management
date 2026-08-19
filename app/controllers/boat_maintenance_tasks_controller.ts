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
        subject: payload.subject,
        boatEngineId: payload.boatEngineId ?? null,
        boatSailId: payload.boatSailId ?? null,
        boatRigId: payload.boatRigId ?? null,
        title: payload.title,
        notes: payload.notes ?? null,
        dueAt: payload.dueAt ?? null,
        recurrenceIntervalMonths: payload.recurrenceIntervalMonths ?? null,
        dueEngineHours: payload.dueEngineHours ?? null,
        recurrenceIntervalEngineHours: payload.recurrenceIntervalEngineHours ?? null,
      })

      await this.auditLogService.log({
        organizationId: user.organizationId!,
        userId: user.id,
        action: 'maintenance_task.create',
        entityType: 'maintenance_task',
        entityId: task.id,
        metadata: { name: task.title, boatName: boat.name },
      })
    } catch (error) {
      if (error instanceof BoatMaintenanceTaskValidationError) {
        session.flash('error', i18n.t(`flash.maintenanceTasks.${error.errorCode}`))
        response.redirect(`/boats/${boat.id}`)
        return
      }
      throw error
    }

    session.flash('success', i18n.t('flash.maintenanceTasks.created'))
    response.redirect(`/boats/${boat.id}`)
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
        response.redirect(`/boats/${boat.id}`)
        return
      }
      if (error instanceof BoatMaintenanceTaskValidationError) {
        session.flash('error', i18n.t(`flash.maintenanceTasks.${error.errorCode}`))
        response.redirect(`/boats/${boat.id}`)
        return
      }
      throw error
    }

    session.flash('success', i18n.t('flash.maintenanceTasks.markedDone'))
    response.redirect(`/boats/${boat.id}`)
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
        response.redirect(`/boats/${boat.id}`)
        return
      }
      throw error
    }

    session.flash('success', i18n.t('flash.maintenanceTasks.removed'))
    response.redirect(`/boats/${boat.id}`)
  }
}
