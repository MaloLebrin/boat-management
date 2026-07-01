import AiAnalysisService, { type AiSuggestion } from '#services/ai_analysis_service'
import DashboardService from '#services/dashboard_service'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class HomeController {
  constructor(
    private dashboardService: DashboardService,
    private aiService: AiAnalysisService
  ) {}

  async index({ inertia, auth }: HttpContext) {
    await auth.check()

    if (!auth.isAuthenticated) {
      return inertia.render('home', {})
    }

    const user = auth.getUserOrFail()
    const data = await this.dashboardService.getForUser(user)

    const latestAnalysis = user.organizationId
      ? await this.aiService.getLatestFleetAnalysis(user.id, user.organizationId)
      : null
    const aiFleetAnalysis: AiSuggestion[] | null = latestAnalysis
      ? (JSON.parse(latestAnalysis.responseText) as AiSuggestion[])
      : null

    return inertia.render('dashboard', { ...data, aiFleetAnalysis })
  }
}
