import AiAnalysisService, { type AiSuggestion } from '#services/ai_analysis_service'
import DashboardService from '#services/dashboard_service'
import PortService from '#services/port_service'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class HomeController {
  constructor(
    private dashboardService: DashboardService,
    private aiService: AiAnalysisService,
    private portService: PortService
  ) {}

  async index({ inertia, auth, response }: HttpContext) {
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
    }

    const data = await this.dashboardService.getForUser(user)

    const latestAnalysis = user.organizationId
      ? await this.aiService.getLatestFleetAnalysis(user.id, user.organizationId)
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

    return inertia.render('dashboard', {
      ...data,
      aiFleetAnalysis,
      portOptions,
      canCreateNavigationLogs,
      canCreateIncidents,
    })
  }
}
