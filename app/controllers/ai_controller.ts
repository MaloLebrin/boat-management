import AiAnalysisService from '#services/ai_analysis_service'
import AiQueueService from '#services/ai_queue_service'
import BoatMaintenanceService from '#services/boat_maintenance_service'
import BoatMaintenanceTaskService from '#services/boat_maintenance_task_service'
import BoatService, { BoatNotFoundError } from '#services/boat_service'
import DashboardService from '#services/dashboard_service'
import { aiChatValidator } from '#validators/ai'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class AiController {
  constructor(
    private aiQueueService: AiQueueService,
    private dashboardService: DashboardService,
    private aiAnalysisService: AiAnalysisService,
    private boatService: BoatService,
    private boatMaintenanceService: BoatMaintenanceService,
    private boatMaintenanceTaskService: BoatMaintenanceTaskService
  ) {}

  async chat({ request, response, auth, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const { messages } = await request.validateUsing(aiChatValidator)

    await this.aiQueueService.enqueueChat({ userId: user.id, messages })

    session.flash('info', i18n.t('flash.ai.chatQueued'))
    return response.redirect().back()
  }

  async fleetAnalysis({ response, auth, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    try {
      const data = await this.dashboardService.getForUser(user)
      await this.aiAnalysisService.generateFleetAnalysis(user.id, data)
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
      const boat = await this.boatService.getForUserOrFail(user, boatId)
      await bouncer.authorize('boatView', boat)
      await boat.load('safetyEquipment')

      const maintenanceEvents = await this.boatMaintenanceService.listForBoat(user, boat)

      const maintenanceTasks = await this.boatMaintenanceTaskService.listForBoat(user, boat)

      await this.aiAnalysisService.generateBoatSuggestions(user.id, boat.id, {
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
