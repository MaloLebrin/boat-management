import AiAnalysisService from '#services/ai_analysis_service'
import AiQueueService from '#services/ai_queue_service'
import BoatMaintenanceService from '#services/boat_maintenance_service'
import BoatMaintenanceTaskService from '#services/boat_maintenance_task_service'
import BoatService, { BoatNotFoundError } from '#services/boat_service'
import DashboardService from '#services/dashboard_service'
import type { HttpContext } from '@adonisjs/core/http'

export default class AiController {
  async chat({ request, response, auth, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const messages = request.input('messages')
    if (!Array.isArray(messages) || messages.length === 0) {
      return response.badRequest({ error: i18n.t('flash.ai.messagesRequired') })
    }

    const queue = new AiQueueService()
    await queue.enqueueChat({ userId: user.id, messages })

    return response.accepted({ status: 'queued' })
  }

  async fleetAnalysis({ response, auth, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    try {
      const data = await new DashboardService().getForUser(user)
      const aiService = new AiAnalysisService()
      await aiService.generateFleetAnalysis(user.id, data)
    } catch {
      session.flash('error', i18n.t('flash.ai.analysisError'))
    }

    return response.redirect('/')
  }

  async boatSuggestions({ response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()
    const boatId = Number(params.id)

    try {
      const boatService = new BoatService()
      const boat = await boatService.getForUserOrFail(user, boatId)
      await bouncer.authorize('boatView', boat)
      await boat.load('safetyEquipment')

      const maintenanceService = new BoatMaintenanceService()
      const maintenanceEvents = await maintenanceService.listForBoat(user, boat)

      const taskService = new BoatMaintenanceTaskService()
      const maintenanceTasks = await taskService.listForBoat(user, boat)

      const aiService = new AiAnalysisService()
      await aiService.generateBoatSuggestions(user.id, boat.id, {
        boat: {
          id: boat.id,
          name: boat.name,
          type: boat.type,
          propulsionType: boat.propulsionType,
          yearBuilt: boat.yearBuilt,
          manufacturer: boat.manufacturer,
          model: boat.model,
          homePort: boat.homePort,
          navigationCategory: boat.navigationCategory,
          engines: boat.engines.map((e) => ({
            kind: e.kind,
            fuel: e.fuel,
            hours: e.hours,
            brand: e.brand,
            model: e.model,
          })),
          sails: boat.sails.map((s) => ({
            sailType: s.sailType,
            manufacturedAt: s.manufacturedAt ? s.manufacturedAt.toISODate() : null,
            status: s.status,
          })),
          rig: boat.rig ? { rigType: boat.rig.rigType, status: boat.rig.status } : null,
          safetyEquipment: boat.safetyEquipment.map((eq) => ({
            equipmentType: eq.equipmentType,
            expiryDate: eq.expiryDate ? eq.expiryDate.toISODate() : null,
            status: eq.status,
          })),
        },
        maintenanceTasks: maintenanceTasks.map((t) => ({
          title: t.title,
          subject: t.subject,
          dueAt: t.dueAt ? t.dueAt.toISODate() : null,
          status: t.status,
        })),
        maintenanceEvents: maintenanceEvents.map((ev) => ({
          title: ev.title,
          subject: ev.subject,
          performedAt: ev.performedAt.toISODate()!,
        })),
      })
    } catch (error) {
      if (!(error instanceof BoatNotFoundError)) {
        session.flash('error', i18n.t('flash.ai.analysisError'))
      }
    }

    return response.redirect(`/boats/${boatId}`)
  }
}
