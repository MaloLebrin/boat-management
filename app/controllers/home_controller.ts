import AiAnalysisService from '#services/ai_analysis_service'
import BoatMaintenanceTaskService from '#services/boat_maintenance_task_service'
import DashboardAttentionService from '#services/dashboard_attention_service'
import DashboardService from '#services/dashboard_service'
import PlanningService from '#services/planning_service'
import PortService from '#services/port_service'
import QuotaService from '#services/quota_service'
import { toBoatTaskEquipment } from '#transformers/maintenance_transformer'
import { toAppLocale } from '#shared/helpers/locale_path'
import type { AiSuggestion } from '#shared/types/ai'
import { deferJson } from '#utils/inertia_defer'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class HomeController {
  constructor(
    private dashboardService: DashboardService,
    private aiService: AiAnalysisService,
    private portService: PortService,
    private planningService: PlanningService,
    private quotaService: QuotaService,
    private taskService: BoatMaintenanceTaskService,
    private attentionService: DashboardAttentionService
  ) {}

  async index({ inertia, auth, request, response, i18n }: HttpContext) {
    await auth.check()

    if (!auth.isAuthenticated) {
      return inertia.render('home', {})
    }

    const user = auth.getUserOrFail()

    if (user.organizationId) {
      const role = await user.getEffectiveRoleInOrg(user.organizationId)
      if (role === 'boat_owner') {
        return response.redirect('/owner/boats')
      }
      // Le mécanicien (capabilities limitées à maintenance.*) n'a pas accès aux
      // KPIs flotte ni aux CTA hors périmètre : dashboard dédié « mes interventions ».
      if (role === 'mechanic') {
        const { overdueTasks, soonTasks } = await this.planningService.getPlanningForOrg(user)
        return inertia.render('dashboard/mechanic', { overdueTasks, soonTasks })
      }
    }

    // La relation `organization` n'est pas chargée à ce stade (le middleware
    // Inertia ne la charge qu'au rendu partagé) : on la charge explicitement,
    // pour les quotas comme pour les gardes de widgets (#418, #832).
    if (user.organizationId) await user.load('organization')

    const data = await this.dashboardService.getForUser(user)

    const latestAnalysis = user.organizationId
      ? await this.aiService.getLatestFleetAnalysis(
          user.id,
          user.organizationId,
          toAppLocale(i18n.locale)
        )
      : null
    const aiFleetAnalysis: AiSuggestion[] | null = latestAnalysis
      ? (JSON.parse(latestAnalysis.responseText) as AiSuggestion[])
      : null

    const portOptions = await this.portService.listNamesForOrg(user)
    const canCreateNavigationLogs = user.organizationId
      ? await user.hasPermission(user.organizationId, 'navigation_logs.create')
      : false
    const canCreateIncidents = user.organizationId
      ? await user.hasPermission(user.organizationId, 'incidents.create')
      : false
    const canCreateMaintenanceTasks = user.organizationId
      ? await user.hasPermission(user.organizationId, 'maintenance.create')
      : false

    // Factures impayées dans « À traiter » : module CRM actif **et** capability
    // de lecture — sinon la donnée n'est pas envoyée du tout (#832).
    const canViewInvoices =
      user.organizationId && user.organization
        ? (await this.quotaService.canManageInvoices(user.organization)) &&
          (await user.hasPermission(user.organizationId, 'invoices.view'))
        : false
    const attention = await this.attentionService.getForUser(
      user,
      data.urgentMaintenance,
      data.stats,
      { canViewInvoices }
    )

    // Quota bateaux pour l'upsell du bouton « Nouveau bateau » (issue #418).
    const boatQuota = user.organization
      ? await this.quotaService.getBoatUsage(user.organization)
      : { used: 0, limit: 0 }
    const canAddBoat = boatQuota.limit === null || boatQuota.used < boatQuota.limit

    return inertia.render('dashboard', {
      boats: data.boats,
      stats: data.stats,
      ports: data.ports,
      portStats: data.portStats,
      attention,
      aiFleetAnalysis,
      portOptions,
      canCreateNavigationLogs,
      canCreateIncidents,
      canCreateMaintenanceTasks,
      // Chargé à la demande par l'ajout rapide de tâche, une fois le bateau choisi.
      taskEquipment: inertia.optional(
        deferJson(async () => {
          const boatId = Number(request.qs().taskBoatId)
          const boat = Number.isInteger(boatId)
            ? await this.taskService.findBoatWithEquipment(user, boatId)
            : null
          return toBoatTaskEquipment(boat)
        })
      ),
      canAddBoat,
      boatQuota,
    })
  }
}
