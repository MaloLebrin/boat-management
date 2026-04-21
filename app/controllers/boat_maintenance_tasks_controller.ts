import BoatMaintenanceTaskService, {
  BoatMaintenanceTaskNotFoundError,
  BoatMaintenanceTaskValidationError,
} from '#services/boat_maintenance_task_service'
import BoatService, { BoatNotFoundError } from '#services/boat_service'
import {
  createBoatMaintenanceTaskValidator,
  markBoatMaintenanceTaskDoneValidator,
} from '#validators/boat_maintenance_task'
import type { HttpContext } from '@adonisjs/core/http'

export default class BoatMaintenanceTasksController {
  async store({ request, response, auth, params, bouncer, session }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const boatService = new BoatService()
    let boat
    try {
      boat = await boatService.getForUserOrFail(user, Number(params.boatId))
    } catch (error) {
      if (error instanceof BoatNotFoundError) {
        response.redirect('/boats')
        return
      }
      throw error
    }

    await bouncer.authorize('boatUpdate', boat)

    const payload = await request.validateUsing(createBoatMaintenanceTaskValidator)
    const taskService = new BoatMaintenanceTaskService()

    try {
      await taskService.createForBoat(user, boat, {
        subject: payload.subject as any,
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
    } catch (error) {
      if (error instanceof BoatMaintenanceTaskValidationError) {
        session.flash('error', error.message)
        response.redirect(`/boats/${boat.id}`)
        return
      }
      throw error
    }

    session.flash('success', 'Maintenance task created.')
    response.redirect(`/boats/${boat.id}`)
  }

  async markDone({ request, response, auth, params, bouncer, session }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const boatService = new BoatService()
    let boat
    try {
      boat = await boatService.getForUserOrFail(user, Number(params.boatId))
    } catch (error) {
      if (error instanceof BoatNotFoundError) {
        response.redirect('/boats')
        return
      }
      throw error
    }

    await bouncer.authorize('boatUpdate', boat)

    const payload = await request.validateUsing(markBoatMaintenanceTaskDoneValidator)
    const taskService = new BoatMaintenanceTaskService()

    try {
      await taskService.markDone(user, boat, Number(params.taskId), {
        doneAt: payload.doneAt ?? undefined,
        doneEngineHours: payload.doneEngineHours ?? null,
      })
    } catch (error) {
      if (error instanceof BoatMaintenanceTaskNotFoundError) {
        session.flash('error', 'Task not found.')
        response.redirect(`/boats/${boat.id}`)
        return
      }
      if (error instanceof BoatMaintenanceTaskValidationError) {
        session.flash('error', error.message)
        response.redirect(`/boats/${boat.id}`)
        return
      }
      throw error
    }

    session.flash('success', 'Task marked done.')
    response.redirect(`/boats/${boat.id}`)
  }

  async destroy({ response, auth, params, bouncer, session }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const boatService = new BoatService()
    let boat
    try {
      boat = await boatService.getForUserOrFail(user, Number(params.boatId))
    } catch (error) {
      if (error instanceof BoatNotFoundError) {
        response.redirect('/boats')
        return
      }
      throw error
    }

    await bouncer.authorize('boatUpdate', boat)

    const taskService = new BoatMaintenanceTaskService()

    try {
      await taskService.deleteForBoat(user, boat, Number(params.taskId))
    } catch (error) {
      if (error instanceof BoatMaintenanceTaskNotFoundError) {
        session.flash('error', 'Task not found.')
        response.redirect(`/boats/${boat.id}`)
        return
      }
      throw error
    }

    session.flash('success', 'Task removed.')
    response.redirect(`/boats/${boat.id}`)
  }
}
